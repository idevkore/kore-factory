import type { SessionState, StationId } from "./contract";

export type RunStatus =
  | "idle"
  | "preparing"
  | "queued"
  | "starting"
  | "running"
  | "waiting"
  | "completed"
  | "interrupted"
  | "failed"
  | "cancelled"
  | "rolled_back";

export interface SessionStatusInput {
  /** Null for a session that has never run. */
  readonly status: RunStatus | null;
  readonly hasPendingApprovals: boolean;
  readonly hasPendingUserInput: boolean;
}

export function sessionStateOf(input: SessionStatusInput): SessionState {
  if (input.hasPendingApprovals) return "needs_approval";
  if (input.hasPendingUserInput) return "needs_answer";
  switch (input.status) {
    case "preparing":
    case "queued":
    case "starting":
      return "starting";
    case "running":
    case "waiting":
      return "working";
    case "completed":
      return "done";
    case "interrupted":
    case "cancelled":
    case "rolled_back":
      return "stopped";
    case "failed":
      return "failed";
    case "idle":
    case null:
      return "idle";
  }
}

export function stationFor(state: SessionState): StationId {
  switch (state) {
    case "starting":
      return "intake";
    case "working":
      return "work";
    case "needs_approval":
    case "needs_answer":
      return "gate";
    case "idle":
    case "done":
    case "stopped":
    case "failed":
      return "home";
  }
}

export function needsYou(state: SessionState): boolean {
  return state === "needs_approval" || state === "needs_answer";
}

export function isActiveState(state: SessionState): boolean {
  return state === "starting" || state === "working" || needsYou(state);
}

const STATE_LABELS: Record<SessionState, string> = {
  starting: "Starting",
  working: "Working",
  needs_approval: "Needs approval",
  needs_answer: "Needs an answer",
  idle: "Idle",
  done: "Done",
  stopped: "Stopped",
  failed: "Failed",
};

export function stateLabel(state: SessionState): string {
  return STATE_LABELS[state];
}

/** "under 1m", "4m", "2h 5m", "3d": how long ago `sinceIso` was at `nowMs`. */
export function formatWaited(sinceIso: string, nowMs: number): string {
  const minutes = Math.floor((nowMs - Date.parse(sinceIso)) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "under 1m";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return minutes % 60 === 0 ? `${hours}h` : `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d`;
}
