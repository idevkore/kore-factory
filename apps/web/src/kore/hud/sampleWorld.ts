import type { IslandSession, IslandWorld } from "../core/contract";

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

/** A made-up world for the panel tests: `visible` idle sessions and the given figures. */
export function sampleWorld(
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
