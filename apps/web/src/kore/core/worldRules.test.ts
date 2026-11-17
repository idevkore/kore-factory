import { describe, expect, it } from "vite-plus/test";

import {
  INITIAL_WORLD_RULES,
  nextWorldRules,
  type WorldRulesEvent,
  type WorldRulesState,
} from "./worldRules";

const RULES = [{ id: "web", name: "Web", projects: ["*site"], paths: [] }];

function run(...events: ReadonlyArray<WorldRulesEvent>): WorldRulesState {
  return events.reduce(nextWorldRules, INITIAL_WORLD_RULES);
}

describe("nextWorldRules", () => {
  it("starts settled with no rules, and loads once an environment is known", () => {
    expect(INITIAL_WORLD_RULES.result).toEqual({ status: "loaded", rules: [] });
    expect(run({ type: "target", target: "a" })).toEqual({
      target: "a",
      result: { status: "loading" },
    });
    expect(
      run({ type: "target", target: "a" }, { type: "loaded", target: "a", rules: RULES }),
    ).toEqual({ target: "a", result: { status: "loaded", rules: RULES } });
  });

  it("ignores a result for an environment that is no longer the target", () => {
    const state = run(
      { type: "target", target: "a" },
      { type: "target", target: "b" },
      { type: "failed", target: "a", message: "late" },
      { type: "loaded", target: "a", rules: RULES },
    );
    expect(state).toEqual({ target: "b", result: { status: "loading" } });
  });

  it("ignores a late result once the load has settled", () => {
    const loaded = run(
      { type: "target", target: "a" },
      { type: "loaded", target: "a", rules: RULES },
    );
    expect(nextWorldRules(loaded, { type: "failed", target: "a", message: "late" })).toBe(loaded);
  });

  it("loads again when the target changes, after a success or a failure", () => {
    expect(
      run(
        { type: "target", target: "a" },
        { type: "loaded", target: "a", rules: RULES },
        { type: "target", target: "b" },
      ),
    ).toEqual({ target: "b", result: { status: "loading" } });
    expect(
      run(
        { type: "target", target: "a" },
        { type: "failed", target: "a", message: "down" },
        { type: "target", target: "b" },
      ),
    ).toEqual({ target: "b", result: { status: "loading" } });
  });

  it("settles with no rules and no message when the request is interrupted", () => {
    expect(run({ type: "target", target: "a" }, { type: "interrupted", target: "a" })).toEqual({
      target: "a",
      result: { status: "loaded", rules: [] },
    });
  });

  it("keeps a failure's message, and settles a waiting load when every environment goes", () => {
    expect(
      run({ type: "target", target: "a" }, { type: "failed", target: "a", message: "down" }).result,
    ).toEqual({ status: "failed", message: "down" });
    expect(run({ type: "target", target: "a" }, { type: "target", target: null })).toEqual(
      INITIAL_WORLD_RULES,
    );
    const loaded = run(
      { type: "target", target: "a" },
      { type: "loaded", target: "a", rules: RULES },
    );
    expect(nextWorldRules(loaded, { type: "target", target: null })).toBe(loaded);
    expect(nextWorldRules(loaded, { type: "target", target: "a" })).toBe(loaded);
  });
});
