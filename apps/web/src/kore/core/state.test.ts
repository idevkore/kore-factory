import { describe, expect, it } from "vite-plus/test";

import type { SessionState } from "./contract";
import { formatWaited, type RunStatus, sessionStateOf, stationFor } from "./state";

const idleFlags = { hasPendingApprovals: false, hasPendingUserInput: false };

describe("sessionStateOf", () => {
  it.each<[RunStatus | null, SessionState]>([
    ["preparing", "starting"],
    ["queued", "starting"],
    ["starting", "starting"],
    ["running", "working"],
    ["waiting", "working"],
    ["idle", "idle"],
    [null, "idle"],
    ["completed", "done"],
    ["interrupted", "stopped"],
    ["cancelled", "stopped"],
    ["rolled_back", "stopped"],
    ["failed", "failed"],
  ])("maps run status %s to %s", (status, state) => {
    expect(sessionStateOf({ status, ...idleFlags })).toBe(state);
  });

  it("puts a pending approval before a pending question and the run status", () => {
    expect(
      sessionStateOf({ status: "running", hasPendingApprovals: true, hasPendingUserInput: true }),
    ).toBe("needs_approval");
    expect(
      sessionStateOf({ status: "running", hasPendingApprovals: false, hasPendingUserInput: true }),
    ).toBe("needs_answer");
    expect(
      sessionStateOf({
        status: "completed",
        hasPendingApprovals: false,
        hasPendingUserInput: true,
      }),
    ).toBe("needs_answer");
  });
});

describe("stationFor", () => {
  it.each<[SessionState, string]>([
    ["starting", "crates"],
    ["working", "anvil"],
    ["needs_approval", "watchtower"],
    ["needs_answer", "watchtower"],
    ["idle", "command"],
    ["done", "command"],
    ["stopped", "command"],
    ["failed", "command"],
  ])("puts %s at the %s", (state, station) => {
    expect(stationFor(state)).toBe(station);
  });
});

describe("formatWaited", () => {
  const now = Date.parse("2026-01-02T12:00:00.000Z");
  it.each([
    ["2026-01-02T11:59:30.000Z", "under 1m"],
    ["2026-01-02T11:56:00.000Z", "4m"],
    ["2026-01-02T10:00:00.000Z", "2h"],
    ["2026-01-02T09:55:00.000Z", "2h 5m"],
    ["2025-12-30T12:00:00.000Z", "3d"],
  ])("formats %s as %s", (since, label) => {
    expect(formatWaited(since, now)).toBe(label);
  });
});
