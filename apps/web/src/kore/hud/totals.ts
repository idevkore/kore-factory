import type { IslandWorld } from "../core/contract";
import { formatWaited } from "../core/state";

export interface IslandTotals {
  readonly working: number;
  readonly waiting: number;
  /** Visible sessions, summed over the worlds. */
  readonly sessions: number;
  /** The oldest `oldestWaitingSince` in any world; null when nothing waits. */
  readonly oldestWaitingSince: string | null;
}

/** The island's figures counted across every world. */
export function islandTotals(worlds: ReadonlyArray<IslandWorld>): IslandTotals {
  let working = 0;
  let waiting = 0;
  let sessions = 0;
  let oldestWaitingSince: string | null = null;
  for (const world of worlds) {
    working += world.working;
    waiting += world.waiting;
    sessions += world.sessions.length;
    const since = world.oldestWaitingSince;
    if (
      since !== null &&
      (oldestWaitingSince === null || Date.parse(since) < Date.parse(oldestWaitingSince))
    ) {
      oldestWaitingSince = since;
    }
  }
  return { working, waiting, sessions, oldestWaitingSince };
}

/** How long the oldest waiting session has waited, or "none". */
export function longestWait(oldestWaitingSince: string | null, nowMs: number): string {
  return oldestWaitingSince === null ? "none" : formatWaited(oldestWaitingSince, nowMs);
}
