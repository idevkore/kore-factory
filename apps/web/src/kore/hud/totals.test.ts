import { describe, expect, it } from "vite-plus/test";

import type { IslandSession, IslandWorld } from "../core/contract";
import { islandTotals, longestWait } from "./totals";

function sessions(count: number, worldId: string): IslandSession[] {
  return Array.from({ length: count }, (_, index) => ({
    key: `env:${worldId}-${index}`,
    ref: { environmentId: "env", threadId: `${worldId}-${index}` },
    projectId: "project",
    projectTitle: "Sample project",
    title: "Tidy the build",
    state: "idle",
    station: "home",
    createdAt: "2026-01-02T08:00:00.000Z",
    updatedAt: "2026-01-02T08:00:00.000Z",
    waitingSince: null,
    worldId,
    lastDecision: null,
  }));
}

function world(
  id: string,
  figures: { visible: number; working: number; waiting: number; oldest: string | null },
): IslandWorld {
  return {
    id,
    name: id,
    sessions: sessions(figures.visible, id),
    working: figures.working,
    waiting: figures.waiting,
    oldestWaitingSince: figures.oldest,
    usage: null,
  };
}

describe("islandTotals", () => {
  it("adds the figures of every world and keeps the oldest wait", () => {
    const worlds = [
      world("reef", { visible: 3, working: 1, waiting: 1, oldest: "2026-01-02T10:00:00.000Z" }),
      world("lagoon", { visible: 5, working: 2, waiting: 0, oldest: null }),
      world("shoal", { visible: 2, working: 0, waiting: 2, oldest: "2026-01-02T09:30:00.000Z" }),
    ];
    expect(islandTotals(worlds)).toEqual({
      working: 3,
      waiting: 3,
      sessions: 10,
      oldestWaitingSince: "2026-01-02T09:30:00.000Z",
    });
  });

  it("has no oldest wait when nothing waits, or there are no worlds", () => {
    expect(
      islandTotals([world("reef", { visible: 1, working: 1, waiting: 0, oldest: null })])
        .oldestWaitingSince,
    ).toBeNull();
    expect(islandTotals([])).toEqual({
      working: 0,
      waiting: 0,
      sessions: 0,
      oldestWaitingSince: null,
    });
  });
});

describe("longestWait", () => {
  it("reads none when nothing waits, else how long the oldest has waited", () => {
    const nowMs = Date.parse("2026-01-02T11:05:00.000Z");
    expect(longestWait(null, nowMs)).toBe("none");
    expect(longestWait("2026-01-02T09:00:00.000Z", nowMs)).toBe("2h 5m");
  });
});
