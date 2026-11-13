import { describe, expect, it } from "vite-plus/test";

import type { IslandSession, IslandSnapshot, SessionState } from "./contract";
import { diffSnapshots } from "./diff";
import { stationFor } from "./state";

function session(key: string, state: SessionState): IslandSession {
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
    waitingSince: null,
  };
}

function snapshot(ready: boolean, sessions: ReadonlyArray<IslandSession>): IslandSnapshot {
  return { worldId: "kore-hq", worldTitle: "KORE HQ", ready, sessions };
}

describe("diffSnapshots", () => {
  it("throws no barrels for the sessions in the first ready snapshot", () => {
    const loaded = snapshot(true, [session("a", "working"), session("b", "idle")]);
    expect(diffSnapshots(null, loaded)).toEqual([]);
    expect(diffSnapshots(snapshot(false, []), loaded)).toEqual([]);
  });

  it("reports nothing until the list is ready", () => {
    expect(diffSnapshots(snapshot(false, []), snapshot(false, [session("a", "idle")]))).toEqual([]);
  });

  it("adds sessions that appear after the first ready snapshot and removes those that leave", () => {
    const before = snapshot(true, [session("a", "idle"), session("gone", "done")]);
    const after = snapshot(true, [session("a", "idle"), session("new", "starting")]);
    expect(diffSnapshots(before, after)).toEqual([
      { type: "session_added", key: "new" },
      { type: "session_removed", key: "gone" },
    ]);
  });

  it("reports a state change and the station change it causes", () => {
    const before = snapshot(true, [session("a", "starting"), session("b", "needs_answer")]);
    const after = snapshot(true, [session("a", "working"), session("b", "needs_approval")]);
    expect(diffSnapshots(before, after)).toEqual([
      { type: "state_changed", key: "a", from: "starting", to: "working" },
      { type: "station_changed", key: "a", from: "crates", to: "anvil" },
      { type: "state_changed", key: "b", from: "needs_answer", to: "needs_approval" },
    ]);
  });
});
