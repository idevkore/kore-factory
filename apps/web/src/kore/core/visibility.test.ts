import { describe, expect, it } from "vite-plus/test";

import type { IslandSession, SessionState } from "./contract";
import { stationFor } from "./state";
import { MAX_VISIBLE_SESSIONS, selectVisibleSessions } from "./visibility";

const NOW = Date.parse("2026-01-02T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function session(key: string, state: SessionState, updatedHoursAgo: number): IslandSession {
  const updatedAt = new Date(NOW - updatedHoursAgo * HOUR).toISOString();
  return {
    key,
    ref: { environmentId: "env", threadId: key },
    projectId: "project",
    projectTitle: "Sample project",
    title: `Fix login redirect ${key}`,
    state,
    station: stationFor(state),
    createdAt: updatedAt,
    updatedAt,
    waitingSince: null,
  };
}

const keys = (sessions: ReadonlyArray<IslandSession>) => sessions.map((entry) => entry.key);

describe("selectVisibleSessions", () => {
  it("keeps sessions updated in the last 24 hours and active ones of any age", () => {
    const visible = selectVisibleSessions(
      [
        { session: session("recent-done", "done", 23), archived: false },
        { session: session("old-done", "done", 25), archived: false },
        { session: session("old-working", "working", 48), archived: false },
        { session: session("old-waiting", "needs_answer", 48), archived: false },
        { session: session("old-starting", "starting", 48), archived: false },
      ],
      NOW,
    );
    expect(keys(visible)).toEqual(["old-starting", "old-waiting", "old-working", "recent-done"]);
  });

  it("drops archived sessions even when active", () => {
    const visible = selectVisibleSessions(
      [
        { session: session("archived", "working", 1), archived: true },
        { session: session("kept", "idle", 1), archived: false },
      ],
      NOW,
    );
    expect(keys(visible)).toEqual(["kept"]);
  });

  it("puts active sessions first, then the newest, and stops at 24", () => {
    const candidates = Array.from({ length: 30 }, (_, index) => ({
      session: session(`done-${index}`, "done", index / 2),
      archived: false,
    }));
    candidates.push({ session: session("busy", "working", 20), archived: false });
    const visible = selectVisibleSessions(candidates, NOW);
    expect(visible).toHaveLength(MAX_VISIBLE_SESSIONS);
    expect(visible[0]!.key).toBe("busy");
    expect(keys(visible.slice(1, 4))).toEqual(["done-0", "done-1", "done-2"]);
    expect(keys(visible)).not.toContain("done-23");
  });
});
