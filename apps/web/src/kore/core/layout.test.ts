import { describe, expect, it } from "vite-plus/test";

import type { IslandSession, StationId } from "./contract";
import {
  carrierPoint,
  GROUND_SIZE,
  layoutSessions,
  slotPosition,
  stackPosition,
  STANDING_CAP,
  STATION_POSITIONS,
  type Vec3,
} from "./layout";

const STATIONS: ReadonlyArray<StationId> = ["home", "intake", "work", "gate"];

function session(
  key: string,
  station: StationId,
  createdAt: string,
  waitingSince: string | null = null,
): IslandSession {
  return {
    key,
    ref: { environmentId: "env", threadId: key },
    projectId: "project",
    projectTitle: "Sample project",
    title: "Fix login redirect",
    state: "working",
    station,
    createdAt,
    updatedAt: createdAt,
    waitingSince,
    worldId: "all",
    lastDecision: null,
  };
}

const distance = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[2] - b[2]);

describe("slotPosition", () => {
  it.each(STATIONS)("gives 24 distinct spots on the ground around the %s", (station) => {
    const spots = Array.from({ length: 24 }, (_, index) => slotPosition(station, index, 24));
    for (const spot of spots) {
      expect(Math.abs(spot[0])).toBeLessThanOrEqual(GROUND_SIZE / 2);
      expect(Math.abs(spot[2])).toBeLessThanOrEqual(GROUND_SIZE / 2);
      expect(distance(spot, STATION_POSITIONS[station])).toBeGreaterThan(1.5);
    }
    for (const [index, spot] of spots.entries()) {
      for (const other of spots.slice(index + 1)) {
        expect(distance(spot, other)).toBeGreaterThan(0.5);
      }
    }
  });

  it("is deterministic", () => {
    expect(slotPosition("work", 3, 5)).toEqual(slotPosition("work", 3, 5));
  });

  it("puts a lone figure on the side of the station that faces the centre", () => {
    const [x, , z] = slotPosition("work", 0, 1);
    expect(x).toBeLessThan(STATION_POSITIONS.work[0]);
    expect(z).toBeCloseTo(STATION_POSITIONS.work[2]);
  });
});

/** `count` sessions at `station`, created a minute apart: `${station}-0` is the oldest. */
function crowd(station: StationId, count: number): IslandSession[] {
  return Array.from({ length: count }, (_, index) =>
    session(`${station}-${index}`, station, new Date(Date.UTC(2026, 0, 2, 9, index)).toISOString()),
  );
}

describe("layoutSessions", () => {
  it("numbers figures per station in order of creation", () => {
    const { standing, stacks } = layoutSessions(
      [
        session("second", "work", "2026-01-02T10:00:00.000Z"),
        session("first", "work", "2026-01-02T09:00:00.000Z"),
        session("alone", "intake", "2026-01-02T08:00:00.000Z"),
      ],
      null,
    );
    expect(standing.get("first")).toEqual(slotPosition("work", 0, 2));
    expect(standing.get("second")).toEqual(slotPosition("work", 1, 2));
    expect(standing.get("alone")).toEqual(slotPosition("intake", 0, 1));
    expect(stacks).toEqual([]);
  });

  it("orders the gate by longest waiting, then creation, then key", () => {
    const { standing } = layoutSessions(
      [
        session("waited-least", "gate", "2026-01-02T08:00:00.000Z", "2026-01-02T12:00:00.000Z"),
        session("b-tied", "gate", "2026-01-02T09:00:00.000Z", "2026-01-02T11:00:00.000Z"),
        session("a-tied", "gate", "2026-01-02T09:00:00.000Z", "2026-01-02T11:00:00.000Z"),
        session("older-tied", "gate", "2026-01-02T07:00:00.000Z", "2026-01-02T11:00:00.000Z"),
        session("waited-most", "gate", "2026-01-02T10:00:00.000Z", "2026-01-02T10:00:00.000Z"),
      ],
      null,
    );
    const order = ["waited-most", "older-tied", "a-tied", "b-tied", "waited-least"];
    for (const [index, key] of order.entries()) {
      expect(standing.get(key)).toEqual(slotPosition("gate", index, order.length));
    }
  });

  it.each(STATIONS)("stands the first %s sessions up to the cap and stacks the rest", (station) => {
    const cap = STANDING_CAP[station];
    const sessions = crowd(station, cap + 3);
    const { standing, stacks } = layoutSessions(sessions.toReversed(), null);
    expect([...standing.keys()]).toEqual(sessions.slice(0, cap).map((entry) => entry.key));
    for (const [index, entry] of sessions.slice(0, cap).entries()) {
      expect(standing.get(entry.key)).toEqual(slotPosition(station, index, cap));
    }
    expect(stacks).toEqual([
      {
        station,
        position: stackPosition(station),
        keys: sessions.slice(cap).map((entry) => entry.key),
      },
    ]);
  });

  it("stacks nothing at the cap", () => {
    expect(layoutSessions(crowd("work", STANDING_CAP.work), null).stacks).toEqual([]);
  });

  it("stands a stacked session once it is focused, and stacks the last slot's first", () => {
    const sessions = crowd("work", 11);
    const { standing, stacks } = layoutSessions(sessions, "work-9");
    expect(standing.get("work-9")).toEqual(slotPosition("work", 7, 8));
    expect(standing.has("work-7")).toBe(false);
    expect(standing.size).toBe(8);
    expect(stacks[0]?.keys).toEqual(["work-7", "work-8", "work-10"]);
  });

  it("leaves the order alone when the focused session already stands", () => {
    const sessions = crowd("intake", 9);
    expect(layoutSessions(sessions, "intake-2")).toEqual(layoutSessions(sessions, null));
  });

  it("stands the first stacked session after a click on its stack focuses it", () => {
    const sessions = crowd("gate", 8);
    const first = layoutSessions(sessions, null).stacks[0]?.keys[0];
    expect(first).toBe("gate-6");
    const { standing, stacks } = layoutSessions(sessions, first ?? null);
    expect(standing.has("gate-6")).toBe(true);
    expect(stacks[0]?.keys).toEqual(["gate-5", "gate-7"]);
  });
});

describe("stackPosition", () => {
  it.each(STATIONS)("puts the %s stack on the ground, clear of every slot", (station) => {
    const stack = stackPosition(station);
    expect(Math.abs(stack[0])).toBeLessThanOrEqual(GROUND_SIZE / 2 - 1);
    expect(Math.abs(stack[2])).toBeLessThanOrEqual(GROUND_SIZE / 2 - 1);
    expect(distance(stack, STATION_POSITIONS[station])).toBeGreaterThan(3);
    for (const other of STATIONS) {
      const cap = STANDING_CAP[other];
      for (let count = 1; count <= cap; count += 1) {
        for (let index = 0; index < count; index += 1) {
          expect(distance(stack, slotPosition(other, index, count))).toBeGreaterThan(1.1);
        }
      }
      if (other !== station) {
        expect(distance(stack, stackPosition(other))).toBeGreaterThan(3);
      }
    }
  });
});

describe("carrierPoint", () => {
  it("starts at the hand, lands on the slot and rises in between", () => {
    const from: Vec3 = [-5, 2.3, -5];
    const to: Vec3 = [3, 0, 4];
    expect(carrierPoint(from, to, 0)).toEqual(from);
    const landed = carrierPoint(from, to, 1);
    expect(landed[0]).toBeCloseTo(to[0]);
    expect(landed[1]).toBeCloseTo(to[1]);
    expect(landed[2]).toBeCloseTo(to[2]);
    expect(carrierPoint(from, to, 0.5)[1]).toBeGreaterThan(from[1]);
  });
});
