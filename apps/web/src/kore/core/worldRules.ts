import type { WorldRule } from "./worlds";

/** Loading the world rules from one environment: the one the island reads them from. */
export interface WorldRulesState {
  /** The environment the result belongs to; null before any is known. */
  readonly target: string | null;
  readonly result:
    | { readonly status: "loading" }
    | { readonly status: "loaded"; readonly rules: ReadonlyArray<WorldRule> }
    | { readonly status: "failed"; readonly message: string };
}

export type WorldRulesEvent =
  /** The environment to read from now; null when none is connected. */
  | { readonly type: "target"; readonly target: string | null }
  | { readonly type: "loaded"; readonly target: string; readonly rules: ReadonlyArray<WorldRule> }
  | { readonly type: "failed"; readonly target: string; readonly message: string }
  | { readonly type: "interrupted"; readonly target: string };

const NO_RULES: WorldRulesState["result"] = { status: "loaded", rules: [] };

export const INITIAL_WORLD_RULES: WorldRulesState = { target: null, result: NO_RULES };

/**
 * The rules file is optional, so every path ends settled: a failure keeps its
 * message, an interruption settles with no rules. A result for an environment
 * that is no longer the target, or that arrives after the load settled, is
 * ignored. Returns `state` itself when nothing changed.
 */
export function nextWorldRules(state: WorldRulesState, event: WorldRulesEvent): WorldRulesState {
  if (event.type === "target") {
    if (event.target === state.target) return state;
    // Losing every environment keeps what was loaded; a load still waiting settles empty.
    if (event.target === null) {
      return state.result.status === "loading" ? { target: null, result: NO_RULES } : state;
    }
    return { target: event.target, result: { status: "loading" } };
  }
  if (event.target !== state.target || state.result.status !== "loading") return state;
  switch (event.type) {
    case "loaded":
      return { target: state.target, result: { status: "loaded", rules: event.rules } };
    case "failed":
      return { target: state.target, result: { status: "failed", message: event.message } };
    case "interrupted":
      return { target: state.target, result: NO_RULES };
  }
}
