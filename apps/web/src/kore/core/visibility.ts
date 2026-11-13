import type { IslandSession } from "./contract";
import { isActiveState } from "./state";

export const VISIBLE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const MAX_VISIBLE_SESSIONS = 24;

export interface VisibilityCandidate {
  readonly session: IslandSession;
  readonly archived: boolean;
}

/**
 * Unarchived sessions that are active or were updated in the last 24 hours,
 * active first and then newest, at most 24.
 */
export function selectVisibleSessions(
  candidates: ReadonlyArray<VisibilityCandidate>,
  nowMs: number,
): IslandSession[] {
  const cutoff = nowMs - VISIBLE_WINDOW_MS;
  return candidates
    .filter(
      ({ session, archived }) =>
        !archived && (isActiveState(session.state) || Date.parse(session.updatedAt) >= cutoff),
    )
    .map(({ session }) => session)
    .toSorted((a, b) => {
      const activeOrder = Number(isActiveState(b.state)) - Number(isActiveState(a.state));
      if (activeOrder !== 0) return activeOrder;
      const newest = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      return newest !== 0 ? newest : a.key.localeCompare(b.key);
    })
    .slice(0, MAX_VISIBLE_SESSIONS);
}
