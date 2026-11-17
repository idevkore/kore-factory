import { describe, expect, it, vi } from "vite-plus/test";

import type { IslandSession, IslandSnapshot, PendingRequest, SessionState } from "./contract";
import {
  createSimulation,
  resolveSimulation,
  type Simulation,
  simulationPending,
  simulationSnapshot,
  stepSimulation,
} from "./simulator";
import { needsYou } from "./state";
import { MAX_VISIBLE_SESSIONS } from "./visibility";

const SEED = 7;
const START = Date.parse("2026-03-04T09:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const STEP_MS = 2_000;

function snapshotAt(simulation: Simulation): IslandSnapshot {
  return simulationSnapshot(simulation, simulation.nowMs, "The island");
}

function sessionsOf(snapshot: IslandSnapshot): IslandSession[] {
  return snapshot.worlds.flatMap((world) => world.sessions);
}

function findSession(simulation: Simulation, key: string): IslandSession | undefined {
  return sessionsOf(snapshotAt(simulation)).find((session) => session.key === key);
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    const children = value instanceof Map ? [...value.values()] : Object.values(value);
    for (const child of children) deepFreeze(child);
  }
  return value;
}

/** Steps every `STEP_MS` from the simulation's time to `untilMs`, as the hook does. */
function* steps(simulation: Simulation, untilMs: number): Generator<Simulation> {
  let current = simulation;
  for (let at = simulation.nowMs + STEP_MS; at <= untilMs; at += STEP_MS) {
    current = stepSimulation(current, at);
    yield current;
  }
}

function firstWaiting(
  simulation: Simulation,
  matches: (request: PendingRequest) => boolean,
): { readonly key: string; readonly request: PendingRequest } {
  for (const session of sessionsOf(snapshotAt(simulation))) {
    const request = simulationPending(simulation, session.key);
    if (request !== null && matches(request)) return { key: session.key, request };
  }
  throw new Error("No waiting session matches.");
}

describe("the island simulator", () => {
  it("gives the same snapshots for the same seed and times, however often it steps", () => {
    const end = START + 10 * 60 * 1000;
    const often = [...steps(createSimulation(SEED, START), end)].at(-1)!;
    const again = [...steps(createSimulation(SEED, START), end)].at(-1)!;
    const once = stepSimulation(createSimulation(SEED, START), end);
    expect(snapshotAt(again)).toEqual(snapshotAt(often));
    expect(snapshotAt(once)).toEqual(snapshotAt(often));
    expect(snapshotAt(createSimulation(SEED + 1, START))).not.toEqual(
      snapshotAt(createSimulation(SEED, START)),
    );
  });

  it("shows every state and every kind of request in the first snapshot", () => {
    const simulation = createSimulation(SEED, START);
    const states = new Set(sessionsOf(snapshotAt(simulation)).map((session) => session.state));
    const every: SessionState[] = [
      "starting",
      "working",
      "needs_approval",
      "needs_answer",
      "idle",
      "done",
      "stopped",
      "failed",
    ];
    expect([...states].toSorted()).toEqual(every.toSorted());

    const requests = sessionsOf(snapshotAt(simulation)).flatMap((session) => {
      const request = simulationPending(simulation, session.key);
      return request === null ? [] : [request];
    });
    const approvals = requests.flatMap((request) => (request.kind === "approval" ? [request] : []));
    const questions = requests.flatMap((request) =>
      request.kind === "question" ? request.questions : [],
    );
    expect(approvals.some((request) => request.acceptsNote)).toBe(true);
    expect(approvals.some((request) => !request.acceptsNote && request.answerable)).toBe(true);
    expect(requests.filter((request) => !request.answerable)).toHaveLength(1);
    expect(
      requests.some((request) => request.kind === "question" && request.questions.length === 2),
    ).toBe(true);
    expect(questions.some((question) => !question.multiSelect && !question.allowCustomAnswer)).toBe(
      true,
    );
    expect(questions.some((question) => question.multiSelect)).toBe(true);
    expect(questions.some((question) => question.allowCustomAnswer)).toBe(true);
  });

  it("fills the worlds the island needs to try", () => {
    const simulation = createSimulation(SEED, START);
    const worlds = snapshotAt(simulation).worlds;
    expect(worlds.map((world) => world.name)).toEqual([
      "Harbor Works",
      "Pearl Ledger",
      "Tidewatch",
      "Driftwood Labs",
      "Unsorted",
    ]);
    const [harbor, , tidewatch, driftwood] = worlds;
    expect(simulation.sessions.filter((session) => session.worldId === harbor!.id).length).toBe(27);
    expect(harbor!.sessions).toHaveLength(MAX_VISIBLE_SESSIONS);
    expect(harbor!.sessions.filter((session) => session.state === "working").length).toBe(10);
    expect(harbor!.waiting).toBe(9);
    expect(tidewatch!.waiting).toBe(0);
    expect(driftwood!.sessions).toHaveLength(1);
    expect(simulation.sessions).toHaveLength(41);
  });

  it("over an hour, sessions arrive and leave, within the cap, and waiting ones hold still", () => {
    const first = createSimulation(SEED, START);
    const firstKeys = new Set(first.sessions.map((session) => session.key));
    const waitingAtStart = first.sessions.filter(
      (session) => needsYou(session.state) && session.request?.answerable === true,
    );
    const seen = new Set<string>();
    let last = first;
    for (const simulation of steps(first, START + HOUR_MS)) {
      const snapshot = snapshotAt(simulation);
      for (const world of snapshot.worlds) {
        expect(world.sessions.length).toBeLessThanOrEqual(MAX_VISIBLE_SESSIONS);
      }
      expect(snapshot.worlds.find((world) => world.name === "Tidewatch")!.waiting).toBe(0);
      expect(simulation.sessions).toHaveLength(first.sessions.length);
      for (const session of simulation.sessions) seen.add(session.key);
      last = simulation;
    }
    expect(
      [...firstKeys].some((key) => !last.sessions.some((session) => session.key === key)),
    ).toBe(true);
    expect([...seen].some((key) => !firstKeys.has(key))).toBe(true);
    for (const waiting of waitingAtStart) {
      expect(last.sessions.find((session) => session.key === waiting.key)).toEqual(waiting);
    }
  });

  it("keeps answerable requests coming when every one is answered at once", () => {
    let simulation = createSimulation(SEED, START);
    const firstRequests = new Set(
      simulation.sessions.flatMap((session) =>
        session.request === null ? [] : [session.request.requestId],
      ),
    );
    const newAnswerable = new Map<string, number>();
    for (let at = START; at <= START + HOUR_MS; at += STEP_MS) {
      simulation = stepSimulation(simulation, at);
      const open = simulation.sessions.flatMap((session) =>
        session.request === null ? [] : [{ session, request: session.request }],
      );
      expect(open.filter(({ request }) => !request.answerable).length).toBeLessThanOrEqual(1);
      for (const { session, request } of open) {
        if (!request.answerable) continue;
        if (!firstRequests.has(request.requestId)) {
          newAnswerable.set(session.worldId, (newAnswerable.get(session.worldId) ?? 0) + 1);
        }
        simulation = resolveSimulation(
          simulation,
          session.key,
          request.requestId,
          request.kind === "approval" ? { kind: "approve" } : { kind: "answer", answers: {} },
          at,
        );
      }
    }
    for (const worldId of ["harbor-works", "pearl-ledger", "driftwood-labs", "unsorted"]) {
      expect(newAnswerable.get(worldId) ?? 0).toBeGreaterThan(0);
    }
    expect(newAnswerable.has("tidewatch")).toBe(false);
  });

  it("clears the locked request by itself 180 seconds after it opened", () => {
    const simulation = createSimulation(SEED, START);
    const locked = simulation.sessions.find((session) => session.request?.answerable === false)!;
    const opened = locked.waitingSinceMs!;
    const before = stepSimulation(simulation, opened + 180_000 - 1);
    expect(simulationPending(before, locked.key)).toEqual(locked.request);
    const after = stepSimulation(before, opened + 180_000);
    expect(simulationPending(after, locked.key)).toBeNull();
    expect(findSession(after, locked.key)).toMatchObject({
      state: "working",
      waitingSince: null,
      lastDecision: null,
    });
  });

  it("ignores a time that is not finite or not later", () => {
    const simulation = stepSimulation(createSimulation(SEED, START), START + 60_000);
    for (const at of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, START]) {
      expect(stepSimulation(simulation, at)).toBe(simulation);
    }
  });

  it("moves the schedule forward over a jump past a day instead of replaying it", () => {
    const simulation = createSimulation(SEED, START);
    const jumpMs = 25 * HOUR_MS;
    const jumped = stepSimulation(simulation, START + jumpMs);
    expect(jumped.nowMs).toBe(START + jumpMs);
    expect(jumped.sessions.map(({ key, state, request }) => ({ key, state, request }))).toEqual(
      simulation.sessions.map(({ key, state, request }) => ({ key, state, request })),
    );
    expect(jumped.sessions.map((session) => session.dueAtMs)).toEqual(
      simulation.sessions.map((session) =>
        session.dueAtMs === null ? null : session.dueAtMs + jumpMs,
      ),
    );
    expect(stepSimulation(simulation, 1e13).nowMs).toBe(1e13);
  });

  it("never mutates the simulation it is given", () => {
    const simulation = deepFreeze(createSimulation(SEED, START));
    const copy = structuredClone(simulation);
    const { key, request } = firstWaiting(
      simulation,
      (entry) => entry.kind === "approval" && entry.answerable,
    );
    const denied = deepFreeze(
      resolveSimulation(simulation, key, request.requestId, { kind: "deny" }, START + 1_000),
    );
    const deniedCopy = structuredClone(denied);
    stepSimulation(denied, START + HOUR_MS);
    expect(simulation).toEqual(copy);
    expect(denied).toEqual(deniedCopy);
  });

  it("sends an approved session back to work", () => {
    const simulation = createSimulation(SEED, START);
    const { key, request } = firstWaiting(
      simulation,
      (entry) => entry.kind === "approval" && entry.answerable,
    );
    const resolved = resolveSimulation(
      simulation,
      key,
      request.requestId,
      { kind: "approve" },
      START + 1_000,
    );
    expect(findSession(resolved, key)).toMatchObject({
      state: "working",
      waitingSince: null,
      lastDecision: null,
    });
    expect(simulationPending(resolved, key)).toBeNull();
    expect(simulationPending(simulation, key)).toEqual(request);
  });

  it("sends an answered session back to work", () => {
    const simulation = createSimulation(SEED, START);
    const { key, request } = firstWaiting(simulation, (entry) => entry.kind === "question");
    const resolved = resolveSimulation(
      simulation,
      key,
      request.requestId,
      { kind: "answer", answers: { format: "iso" } },
      START + 1_000,
    );
    expect(findSession(resolved, key)).toMatchObject({ state: "working", lastDecision: null });
    expect(simulationPending(resolved, key)).toBeNull();
  });

  it("marks a denied session, keeps it working, and clears the mark by the real rule", () => {
    const simulation = createSimulation(SEED, START);
    const { key, request } = firstWaiting(
      simulation,
      (entry) => entry.kind === "approval" && entry.answerable,
    );
    const denied = resolveSimulation(
      simulation,
      key,
      request.requestId,
      { kind: "deny", note: "Not yet" },
      START,
    );
    expect(findSession(denied, key)).toMatchObject({ state: "working", lastDecision: "denied" });

    let cleared = false;
    for (const later of steps(denied, START + HOUR_MS)) {
      const session = findSession(later, key);
      if (session === undefined || needsYou(session.state)) {
        expect(later.denied.has(key)).toBe(false);
        expect(session?.lastDecision ?? null).toBeNull();
        cleared = true;
        break;
      }
      expect(session.lastDecision).toBe("denied");
    }
    expect(cleared).toBe(true);
  });

  it("refuses a request that is not open or cannot be answered here", () => {
    const simulation = createSimulation(SEED, START);
    const approval = firstWaiting(
      simulation,
      (entry) => entry.kind === "approval" && entry.answerable,
    );
    const locked = firstWaiting(simulation, (entry) => !entry.answerable);
    expect(() =>
      resolveSimulation(simulation, approval.key, "sim-request-0", { kind: "approve" }, START),
    ).toThrow("no longer open");
    expect(() =>
      resolveSimulation(
        simulation,
        approval.key,
        approval.request.requestId,
        { kind: "answer", answers: {} },
        START,
      ),
    ).toThrow("not a question");
    expect(() =>
      resolveSimulation(
        simulation,
        locked.key,
        locked.request.requestId,
        { kind: "approve" },
        START,
      ),
    ).toThrow("in its thread");
    const approved = resolveSimulation(
      simulation,
      approval.key,
      approval.request.requestId,
      { kind: "approve" },
      START,
    );
    expect(() =>
      resolveSimulation(
        approved,
        approval.key,
        approval.request.requestId,
        { kind: "approve" },
        START,
      ),
    ).toThrow("no longer open");
  });

  it("reads neither the wall clock nor the global random function", () => {
    using _now = vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("The simulator read the wall clock.");
    });
    using _random = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("The simulator used Math.random.");
    });
    const simulation = createSimulation(SEED, START);
    const { key, request } = firstWaiting(simulation, (entry) => entry.kind === "question");
    const resolved = resolveSimulation(
      simulation,
      key,
      request.requestId,
      { kind: "answer", answers: { pages: ["home"] } },
      START + 1_000,
    );
    expect(snapshotAt(stepSimulation(resolved, START + HOUR_MS)).worlds.length).toBeGreaterThan(0);
  });
});
