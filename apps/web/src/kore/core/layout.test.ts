import { describe, expect, it } from "vite-plus/test";

import type { IslandSession, StationId } from "./contract";
import {
  carrierPoint,
  GROUND_SIZE,
  layoutSessions,
  slotPosition,
  STATION_POSITIONS,
  type Vec3,
} from "./layout";

const STATIONS: ReadonlyArray<StationId> = ["home", "intake", "work", "gate"];

function session(key: string, station: StationId, createdAt: string): IslandSession {
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
    waitingSince: null,
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

describe("layoutSessions", () => {
  it("numbers figures per station in order of creation", () => {
    const positions = layoutSessions([
      session("second", "work", "2026-01-02T10:00:00.000Z"),
      session("first", "work", "2026-01-02T09:00:00.000Z"),
      session("alone", "intake", "2026-01-02T08:00:00.000Z"),
    ]);
    expect(positions.get("first")).toEqual(slotPosition("work", 0, 2));
    expect(positions.get("second")).toEqual(slotPosition("work", 1, 2));
    expect(positions.get("alone")).toEqual(slotPosition("intake", 0, 1));
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
