import type { IslandEvent, IslandSession } from "./contract";

/** One world's sessions at one moment, and whether the feed has loaded them. */
interface SessionsView {
  readonly ready: boolean;
  readonly sessions: ReadonlyArray<IslandSession>;
}

/**
 * What changed between two views. The first ready view yields no events, so
 * sessions that already exist appear in place; only sessions that appear
 * after it are added.
 */
export function diffSnapshots(prev: SessionsView | null, next: SessionsView): IslandEvent[] {
  if (!next.ready || prev === null || !prev.ready) return [];
  const before = new Map(prev.sessions.map((session) => [session.key, session]));
  const after = new Set(next.sessions.map((session) => session.key));
  const events: IslandEvent[] = [];
  for (const session of next.sessions) {
    const old = before.get(session.key);
    if (old === undefined) {
      events.push({ type: "session_added", key: session.key });
      continue;
    }
    if (old.state !== session.state) {
      events.push({ type: "state_changed", key: session.key, from: old.state, to: session.state });
    }
    if (old.station !== session.station) {
      events.push({
        type: "station_changed",
        key: session.key,
        from: old.station,
        to: session.station,
      });
    }
  }
  for (const session of prev.sessions) {
    if (!after.has(session.key)) events.push({ type: "session_removed", key: session.key });
  }
  return events;
}
