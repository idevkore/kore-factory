import { describe, expect, it } from "vite-plus/test";

import type { SessionState } from "./contract";
import { clearDenied, type DeniedMarks, markDenied, reconcileDenied } from "./denied";

const ASKED_AT = "2026-01-02T10:00:00.000Z";
const view = (state: SessionState, waitingSince: string | null = null) => ({
  key: "a",
  state,
  waitingSince,
});

/** Applies each state in turn, from a mark set when the request at ASKED_AT was denied. */
function afterDenial(...steps: ReadonlyArray<ReturnType<typeof view>>): DeniedMarks {
  let marks = markDenied(new Map(), { key: "a", waitingSince: ASKED_AT });
  for (const step of steps) marks = reconcileDenied(marks, [step]);
  return marks;
}

describe("denied marks", () => {
  it("keeps the mark while the denied request still shows, and through the rest of the run", () => {
    expect(afterDenial(view("needs_approval", ASKED_AT)).has("a")).toBe(true);
    expect(
      afterDenial(
        view("needs_approval", ASKED_AT),
        view("working"),
        view("idle"),
        view("done"),
        view("stopped"),
        view("failed"),
      ).has("a"),
    ).toBe(true);
  });

  it("clears the mark when the session starts again", () => {
    expect(afterDenial(view("working"), view("starting")).has("a")).toBe(false);
  });

  it("clears the mark when the session waits on a new request", () => {
    expect(afterDenial(view("working"), view("needs_approval", ASKED_AT)).has("a")).toBe(false);
    expect(afterDenial(view("needs_answer", "2026-01-02T10:05:00.000Z")).has("a")).toBe(false);
  });

  it("clears the mark when the session disappears", () => {
    const marks = markDenied(new Map(), { key: "a", waitingSince: ASKED_AT });
    expect(reconcileDenied(marks, []).has("a")).toBe(false);
  });

  it("clears the mark on an approval or answer from the island", () => {
    const marks = markDenied(new Map(), { key: "a", waitingSince: ASKED_AT });
    expect(clearDenied(marks, "a").has("a")).toBe(false);
  });

  it("returns the same marks when nothing changed", () => {
    const marks = afterDenial(view("working"));
    expect(reconcileDenied(marks, [view("done")])).toBe(marks);
    const none: DeniedMarks = new Map();
    expect(reconcileDenied(none, [view("working")])).toBe(none);
    expect(clearDenied(none, "a")).toBe(none);
  });
});
