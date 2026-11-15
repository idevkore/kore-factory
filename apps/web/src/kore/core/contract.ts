export type SessionState =
  | "starting" // T3 status preparing | queued | starting
  | "working" // running | waiting
  | "needs_approval" // a pending approval request
  | "needs_answer" // a pending question
  | "idle" // idle
  | "done" // completed
  | "stopped" // interrupted | cancelled | rolled_back
  | "failed"; // failed

export type StationId = "home" | "intake" | "work" | "gate";

export interface SessionRef {
  readonly environmentId: string;
  readonly threadId: string;
}

export interface IslandSession {
  readonly key: string; // `${environmentId}:${threadId}`
  readonly ref: SessionRef;
  readonly projectId: string;
  readonly projectTitle: string;
  readonly title: string;
  readonly state: SessionState;
  readonly station: StationId; // stationFor(state)
  readonly createdAt: string; // ISO
  readonly updatedAt: string; // ISO
  readonly waitingSince: string | null; // ISO, only in needs_* states
}

export interface IslandSnapshot {
  readonly worldId: string;
  readonly ready: boolean; // false until the thread list has loaded
  readonly sessions: ReadonlyArray<IslandSession>;
}

export interface PendingQuestion {
  readonly id: string;
  readonly header: string;
  readonly question: string;
  readonly options: ReadonlyArray<{ label: string; description: string; value: string }>;
  readonly allowCustomAnswer: boolean;
  readonly multiSelect: boolean;
}

export type PendingRequest =
  | {
      kind: "approval";
      requestId: string;
      prompt: string;
      answerable: boolean;
      /** The provider takes a note with a denial; the server rejects one otherwise. */
      acceptsNote: boolean;
    }
  | {
      kind: "question";
      requestId: string;
      questions: ReadonlyArray<PendingQuestion>;
      answerable: boolean;
    };

export type Resolution =
  | { kind: "approve" }
  | { kind: "deny"; note?: string }
  | { kind: "answer"; answers: Readonly<Record<string, string | ReadonlyArray<string>>> };

export interface IslandFeed {
  readonly snapshot: IslandSnapshot;
  /** The focused session's open request; null when it has none or it is still loading. */
  readonly pending: PendingRequest | null;
  readonly pendingLoading: boolean;
  resolve(sessionKey: string, requestId: string, resolution: Resolution): Promise<void>;
  openInConsole(sessionKey: string): void;
}

export type IslandEvent =
  | { type: "session_added"; key: string }
  | { type: "session_removed"; key: string }
  | { type: "state_changed"; key: string; from: SessionState; to: SessionState }
  | { type: "station_changed"; key: string; from: StationId; to: StationId };

export const ISLAND_WORLD = { id: "kore-hq" } as const;
