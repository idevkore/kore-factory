import { describe, expect, it } from "vite-plus/test";

import type { IslandSession, SessionState } from "./contract";
import { nextWaiting, waitingSessions } from "./navigation";
import { stationFor } from "./state";

function session(key: string, state: SessionState, waitingSince: string | null): IslandSession {
  return {
    key,
    ref: { environmentId: "env", threadId: key },
    projectId: "project",
    projectTitle: "Sample project",
    title: "Fix login redirect",
    state,
    station: stationFor(state),
    createdAt: "2026-01-02T08:00:00.000Z",
    updatedAt: "2026-01-02T08:00:00.000Z",
    waitingSince,
    worldId: "all",
    lastDecision: null,
  };
}

const sessions = [
  session("newest", "needs_answer", "2026-01-02T11:00:00.000Z"),
  session("busy", "working", null),
  session("oldest", "needs_approval", "2026-01-02T09:00:00.000Z"),
  session("middle", "needs_approval", "2026-01-02T10:00:00.000Z"),
];

describe("waitingSessions", () => {
  it("lists only sessions that need the user, longest-waiting first", () => {
    expect(waitingSessions(sessions).map((entry) => entry.key)).toEqual([
      "oldest",
      "middle",
      "newest",
    ]);
  });
});

describe("nextWaiting", () => {
  it("starts at the longest-waiting session when nothing waiting is focused", () => {
    expect(nextWaiting(sessions, null)).toBe("oldest");
    expect(nextWaiting(sessions, "busy")).toBe("oldest");
  });

  it("steps to the next oldest and wraps round", () => {
    expect(nextWaiting(sessions, "oldest")).toBe("middle");
    expect(nextWaiting(sessions, "middle")).toBe("newest");
    expect(nextWaiting(sessions, "newest")).toBe("oldest");
  });

  it("stays on the only waiting session and is null when none waits", () => {
    expect(nextWaiting([sessions[0]!], sessions[0]!.key)).toBe("newest");
    expect(nextWaiting([sessions[1]!], null)).toBeNull();
  });
});
