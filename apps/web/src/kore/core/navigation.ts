import type { IslandSession } from "./contract";
import { needsYou } from "./state";

/** Sessions waiting on the user, the longest-waiting first. */
export function waitingSessions(sessions: ReadonlyArray<IslandSession>): IslandSession[] {
  return sessions
    .filter((session) => needsYou(session.state))
    .toSorted(
      (a, b) =>
        Date.parse(a.waitingSince ?? a.updatedAt) - Date.parse(b.waitingSince ?? b.updatedAt) ||
        a.key.localeCompare(b.key),
    );
}

/**
 * The waiting session after `currentKey`, oldest first and wrapping round;
 * the oldest when `currentKey` is not waiting. Null when nothing waits.
 */
export function nextWaiting(
  sessions: ReadonlyArray<IslandSession>,
  currentKey: string | null,
): string | null {
  const waiting = waitingSessions(sessions);
  if (waiting.length === 0) return null;
  const current = waiting.findIndex((session) => session.key === currentKey);
  return waiting[(current + 1) % waiting.length]!.key;
}
