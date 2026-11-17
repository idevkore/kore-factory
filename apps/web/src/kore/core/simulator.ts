import type {
  IslandSession,
  IslandSnapshot,
  PendingRequest,
  Resolution,
  SessionState,
} from "./contract";
import { clearDenied, type DeniedMarks, markDenied, reconcileDenied } from "./denied";
import { needsYou, stationFor } from "./state";
import { buildWorlds, worldIdFor, type WorldRule } from "./worlds";

const ENVIRONMENT_ID = "simulated";
const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;

const RULES: ReadonlyArray<WorldRule> = [
  { id: "harbor-works", name: "Harbor Works", projects: ["Harbor *"], paths: [] },
  { id: "pearl-ledger", name: "Pearl Ledger", projects: ["Pearl *"], paths: [] },
  { id: "tidewatch", name: "Tidewatch", projects: ["Tidewatch *"], paths: [] },
  { id: "driftwood-labs", name: "Driftwood Labs", projects: ["Driftwood *"], paths: [] },
];

/** A set of projects whose sessions keep a fixed number alive: one leaving brings one in. */
interface Group {
  readonly projects: ReadonlyArray<string>;
  /** The states its sessions start in; the length is the group's population. */
  readonly initial: ReadonlyArray<SessionState>;
  /** A run that would wait while this many already wait finishes instead. */
  readonly waitingCap: number;
}

function repeat(state: SessionState, count: number): SessionState[] {
  return Array.from({ length: count }, () => state);
}

const GROUPS: ReadonlyArray<Group> = [
  {
    // Past the 24 cap, and enough at work and at the gate for the scene to stack them.
    projects: ["Harbor billing service", "Harbor docs site", "Harbor mobile app"],
    initial: [
      ...repeat("starting", 2),
      ...repeat("working", 10),
      ...repeat("needs_approval", 5),
      ...repeat("needs_answer", 4),
      ...repeat("done", 3),
      ...repeat("failed", 2),
      "stopped",
    ],
    waitingCap: 10,
  },
  {
    projects: ["Pearl ledger core", "Pearl monthly reports"],
    initial: ["working", "working", "needs_approval", "idle", "done", "failed"],
    waitingCap: 2,
  },
  {
    // Nothing here ever waits.
    projects: ["Tidewatch sensor feed", "Tidewatch alerts"],
    initial: ["starting", "working", "working", "done"],
    waitingCap: 0,
  },
  { projects: ["Driftwood prototype"], initial: ["working"], waitingCap: 1 },
  {
    // No rule matches these, so they land in Unsorted.
    projects: ["Weekend sketches", "Scratch notes"],
    initial: ["working", "needs_answer", "stopped"],
    waitingCap: 1,
  },
];

const TITLES: ReadonlyArray<string> = [
  "Fix the login redirect",
  "Add retries to the upload queue",
  "Tidy the settings page",
  "Write tests for the invoice export",
  "Speed up the search index",
  "Rename the config loader",
  "Update the onboarding copy",
  "Track down the flaky build",
  "Split the report generator",
  "Cache the map tiles",
  "Remove unused styles",
  "Add dark mode to the charts",
  "Move the job scheduler to a queue",
  "Document the import format",
  "Handle empty rows in the CSV parser",
  "Lower memory use in the sync worker",
  "Show a spinner while saving",
  "Check the date picker on small screens",
];

type ApprovalTemplate = Omit<Extract<PendingRequest, { kind: "approval" }>, "requestId">;
type QuestionTemplate = Omit<Extract<PendingRequest, { kind: "question" }>, "requestId">;

const APPROVALS: ReadonlyArray<ApprovalTemplate> = [
  {
    kind: "approval",
    prompt: "Run the database migration against the local copy.",
    answerable: true,
    acceptsNote: true,
  },
  {
    kind: "approval",
    prompt: "Delete the build folder and build again.",
    answerable: true,
    acceptsNote: false,
  },
  {
    kind: "approval",
    prompt: "Push the branch to the shared remote.",
    answerable: false,
    acceptsNote: false,
  },
];

const QUESTIONS: ReadonlyArray<QuestionTemplate> = [
  {
    kind: "question",
    answerable: true,
    questions: [
      {
        id: "format",
        header: "Format",
        question: "Which date format should the export use?",
        options: [
          { label: "ISO", description: "2026-01-31", value: "iso" },
          { label: "Day first", description: "31/01/2026", value: "day-first" },
          { label: "Month first", description: "01/31/2026", value: "month-first" },
        ],
        allowCustomAnswer: false,
        multiSelect: false,
      },
    ],
  },
  {
    kind: "question",
    answerable: true,
    questions: [
      {
        id: "pages",
        header: "Pages",
        question: "Which pages should get the new header?",
        options: [
          { label: "Home", description: "The landing page", value: "home" },
          { label: "Pricing", description: "Plans and prices", value: "pricing" },
          { label: "Help", description: "The help centre", value: "help" },
        ],
        allowCustomAnswer: false,
        multiSelect: true,
      },
    ],
  },
  {
    kind: "question",
    answerable: true,
    questions: [
      {
        id: "name",
        header: "Name",
        question: "What should the new command be called?",
        options: [
          { label: "sync", description: "Short and plain", value: "sync" },
          { label: "refresh", description: "Matches the button", value: "refresh" },
        ],
        allowCustomAnswer: true,
        multiSelect: false,
      },
    ],
  },
];

/** [min, max] in milliseconds, both included. */
const STARTING_MS = [2 * SECOND_MS, 8 * SECOND_MS] as const;
const WORKING_MS = [10 * SECOND_MS, 60 * SECOND_MS] as const;
const LINGER_MS = [20 * SECOND_MS, 120 * SECOND_MS] as const;

interface SimulatedSession {
  readonly key: string;
  readonly threadId: string;
  readonly group: number;
  readonly projectId: string;
  readonly projectTitle: string;
  readonly worldId: string;
  readonly title: string;
  readonly state: SessionState;
  readonly createdAtMs: number;
  readonly updatedAtMs: number;
  readonly waitingSinceMs: number | null;
  /** When it next moves on: starts work, finishes work, or leaves. Null while it waits. */
  readonly dueAtMs: number | null;
  readonly request: PendingRequest | null;
}

/** Made-up sessions at one moment. An immutable value: every change returns a new one. */
export interface Simulation {
  /** The time it has been stepped to. */
  readonly nowMs: number;
  /** The seeded random function's state. */
  readonly random: number;
  readonly nextId: number;
  readonly sessions: ReadonlyArray<SimulatedSession>;
  readonly denied: DeniedMarks;
}

/** mulberry32: small, seeded and fast. Its state goes back into the `Simulation`. */
function randomFrom(state: number) {
  let seed = state >>> 0;
  const next = () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
  const between = ([min, max]: readonly [number, number]) =>
    min + Math.floor(next() * (max - min + 1));
  const pick = <T>(items: ReadonlyArray<T>): T => items[Math.floor(next() * items.length)]!;
  return { next, between, pick, state: () => seed };
}

type Random = ReturnType<typeof randomFrom>;

function iso(ms: number): string {
  return new Date(ms).toISOString();
}

function withRequestId(template: ApprovalTemplate | QuestionTemplate, id: number): PendingRequest {
  return { ...template, requestId: `sim-request-${id}` };
}

function newSession(
  id: number,
  group: number,
  random: Random,
  fields: Pick<
    SimulatedSession,
    "state" | "createdAtMs" | "updatedAtMs" | "waitingSinceMs" | "dueAtMs" | "request"
  >,
): SimulatedSession {
  const projects = GROUPS[group]!.projects;
  const projectTitle = random.pick(projects);
  const threadId = `sim-${id}`;
  return {
    key: `${ENVIRONMENT_ID}:${threadId}`,
    threadId,
    group,
    projectId: `sim-project-${group}-${projects.indexOf(projectTitle)}`,
    projectTitle,
    worldId: worldIdFor(RULES, { title: projectTitle, workspaceRoot: null }),
    title: random.pick(TITLES),
    ...fields,
  };
}

function reconciled(sessions: ReadonlyArray<SimulatedSession>, denied: DeniedMarks): DeniedMarks {
  return reconcileDenied(
    denied,
    sessions.map((session) => ({
      key: session.key,
      state: session.state,
      waitingSince: session.waitingSinceMs === null ? null : iso(session.waitingSinceMs),
    })),
  );
}

/** The made-up island at `nowMs`: every state on show, and every kind of request waiting. */
export function createSimulation(seed: number, nowMs: number): Simulation {
  const random = randomFrom(seed);
  let nextId = 1;
  let approvals = 0;
  let questions = 0;
  const sessions = GROUPS.flatMap((group, groupIndex) =>
    group.initial.map((state) => {
      const id = nextId++;
      const createdAtMs = nowMs - random.between([30 * MINUTE_MS, 120 * MINUTE_MS]);
      if (needsYou(state)) {
        const waitingSinceMs = nowMs - random.between([MINUTE_MS, 25 * MINUTE_MS]);
        const request =
          state === "needs_approval"
            ? withRequestId(APPROVALS[approvals++ % APPROVALS.length]!, id)
            : withRequestId(QUESTIONS[questions++ % QUESTIONS.length]!, id);
        return newSession(id, groupIndex, random, {
          state,
          createdAtMs,
          updatedAtMs: waitingSinceMs,
          waitingSinceMs,
          dueAtMs: null,
          request,
        });
      }
      const active = state === "starting" || state === "working";
      const updatedAtMs =
        nowMs - random.between(active ? [0, 5 * MINUTE_MS] : [MINUTE_MS, 20 * MINUTE_MS]);
      const dueIn =
        state === "starting" ? STARTING_MS : state === "working" ? WORKING_MS : LINGER_MS;
      return newSession(id, groupIndex, random, {
        state,
        createdAtMs,
        updatedAtMs,
        waitingSinceMs: null,
        dueAtMs: nowMs + random.between(dueIn),
        request: null,
      });
    }),
  );
  return { nowMs, random: random.state(), nextId, sessions, denied: new Map() };
}

/** What a run that has finished its work does next. */
function finishWork(
  simulation: Simulation,
  session: SimulatedSession,
  atMs: number,
  random: Random,
): { readonly session: SimulatedSession; readonly nextId: number } {
  const waiting = simulation.sessions.filter(
    (other) => other.group === session.group && needsYou(other.state),
  ).length;
  const roll = random.next();
  if (waiting < GROUPS[session.group]!.waitingCap && roll < 0.5) {
    const id = simulation.nextId;
    const request =
      roll < 0.25
        ? withRequestId(random.pick(APPROVALS), id)
        : withRequestId(random.pick(QUESTIONS), id);
    return {
      nextId: id + 1,
      session: {
        ...session,
        state: request.kind === "approval" ? "needs_approval" : "needs_answer",
        updatedAtMs: atMs,
        waitingSinceMs: atMs,
        dueAtMs: null,
        request,
      },
    };
  }
  const end = random.next();
  const state: SessionState = end < 0.6 ? "done" : end < 0.8 ? "failed" : "stopped";
  return {
    nextId: simulation.nextId,
    session: { ...session, state, updatedAtMs: atMs, dueAtMs: atMs + random.between(LINGER_MS) },
  };
}

/** Moves one due session on at its due time. */
function advance(simulation: Simulation, index: number): Simulation {
  const session = simulation.sessions[index]!;
  const atMs = session.dueAtMs!;
  const random = randomFrom(simulation.random);
  let nextId = simulation.nextId;
  let replacement: SimulatedSession;
  if (session.state === "starting") {
    replacement = {
      ...session,
      state: "working",
      updatedAtMs: atMs,
      dueAtMs: atMs + random.between(WORKING_MS),
    };
  } else if (session.state === "working") {
    ({ session: replacement, nextId } = finishWork(simulation, session, atMs, random));
  } else {
    // A finished one leaves and a new one arrives in its place.
    replacement = newSession(nextId++, session.group, random, {
      state: "starting",
      createdAtMs: atMs,
      updatedAtMs: atMs,
      waitingSinceMs: null,
      dueAtMs: atMs + random.between(STARTING_MS),
      request: null,
    });
  }
  const sessions = simulation.sessions.with(index, replacement);
  return {
    nowMs: Math.max(simulation.nowMs, atMs),
    random: random.state(),
    nextId,
    sessions,
    denied: reconciled(sessions, simulation.denied),
  };
}

/** The session due soonest at or before `nowMs`, the first listed on a tie. */
function nextDueIndex(sessions: ReadonlyArray<SimulatedSession>, nowMs: number): number | null {
  let best: number | null = null;
  sessions.forEach((session, index) => {
    if (session.dueAtMs === null || session.dueAtMs > nowMs) return;
    if (best === null || session.dueAtMs < sessions[best]!.dueAtMs!) best = index;
  });
  return best;
}

/**
 * Advances the simulation to `nowMs`, one change at a time in time order, so
 * stepping often or seldom to the same time gives the same result.
 */
export function stepSimulation(simulation: Simulation, nowMs: number): Simulation {
  let current = simulation;
  for (
    let index = nextDueIndex(current.sessions, nowMs);
    index !== null;
    index = nextDueIndex(current.sessions, nowMs)
  ) {
    current = advance(current, index);
  }
  return nowMs > current.nowMs ? { ...current, nowMs } : current;
}

function toIslandSession(session: SimulatedSession, denied: boolean): IslandSession {
  return {
    key: session.key,
    ref: { environmentId: ENVIRONMENT_ID, threadId: session.threadId },
    projectId: session.projectId,
    projectTitle: session.projectTitle,
    title: session.title,
    state: session.state,
    station: stationFor(session.state),
    createdAt: iso(session.createdAtMs),
    updatedAt: iso(session.updatedAtMs),
    waitingSince: session.waitingSinceMs === null ? null : iso(session.waitingSinceMs),
    worldId: session.worldId,
    lastDecision: denied ? "denied" : null,
  };
}

/** The island's worlds, through the same rules, cap and counts as the real feed. */
export function simulationSnapshot(
  simulation: Simulation,
  nowMs: number,
  defaultWorldName: string,
): IslandSnapshot {
  const candidates = simulation.sessions.map((session) => ({
    session: toIslandSession(session, simulation.denied.has(session.key)),
    archived: false,
  }));
  return {
    ready: true,
    worlds: buildWorlds({ rules: RULES, candidates, nowMs, defaultName: defaultWorldName }),
  };
}

export function simulationPending(
  simulation: Simulation,
  sessionKey: string,
): PendingRequest | null {
  return simulation.sessions.find((session) => session.key === sessionKey)?.request ?? null;
}

/**
 * Answers a waiting session at `nowMs`. Approve and answer send it back to
 * work; deny marks it denied by the real feed's rule, and it works on.
 * Throws, as the real feed rejects, when the request is not open or cannot take this answer.
 */
export function resolveSimulation(
  simulation: Simulation,
  sessionKey: string,
  requestId: string,
  resolution: Resolution,
  nowMs: number,
): Simulation {
  const stepped = stepSimulation(simulation, nowMs);
  const index = stepped.sessions.findIndex((session) => session.key === sessionKey);
  const session = stepped.sessions[index];
  const request = session?.request;
  if (session === undefined || request == null || request.requestId !== requestId) {
    throw new Error("This request is no longer open.");
  }
  if (!request.answerable) throw new Error("This request can only be answered in its thread.");
  if (resolution.kind === "answer" && request.kind !== "question") {
    throw new Error("This request is not a question.");
  }
  if (resolution.kind !== "answer" && request.kind !== "approval") {
    throw new Error("This request is not an approval.");
  }
  const atMs = stepped.nowMs;
  const random = randomFrom(stepped.random);
  const marks =
    resolution.kind === "deny"
      ? markDenied(stepped.denied, {
          key: sessionKey,
          waitingSince: session.waitingSinceMs === null ? null : iso(session.waitingSinceMs),
        })
      : clearDenied(stepped.denied, sessionKey);
  const sessions = stepped.sessions.with(index, {
    ...session,
    state: "working",
    updatedAtMs: atMs,
    waitingSinceMs: null,
    dueAtMs: atMs + random.between(WORKING_MS),
    request: null,
  });
  return {
    ...stepped,
    random: random.state(),
    sessions,
    denied: reconciled(sessions, marks),
  };
}
