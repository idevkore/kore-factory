import type { SessionState } from "./contract";
import { needsYou } from "./state";

/** A session whose approval the user denied from the island. */
interface DeniedMark {
  /** When the denied request opened, to tell a new request from the denied one. */
  readonly waitingSince: string | null;
  /** True once the session has shown a state other than waiting since the denial. */
  readonly left: boolean;
}

export type DeniedMarks = ReadonlyMap<string, DeniedMark>;

interface DeniedSessionView {
  readonly key: string;
  readonly state: SessionState;
  readonly waitingSince: string | null;
}

export function markDenied(
  marks: DeniedMarks,
  session: { readonly key: string; readonly waitingSince: string | null },
): DeniedMarks {
  return new Map(marks).set(session.key, { waitingSince: session.waitingSince, left: false });
}

export function clearDenied(marks: DeniedMarks, key: string): DeniedMarks {
  if (!marks.has(key)) return marks;
  const next = new Map(marks);
  next.delete(key);
  return next;
}

/**
 * Keeps a mark through working, idle, done, stopped and failed, since a denied
 * run usually carries on and finishes. Clears it when the session disappears,
 * starts again, or waits on a new request. Returns `marks` itself when nothing changed.
 */
export function reconcileDenied(
  marks: DeniedMarks,
  sessions: ReadonlyArray<DeniedSessionView>,
): DeniedMarks {
  if (marks.size === 0) return marks;
  const byKey = new Map(sessions.map((session) => [session.key, session]));
  let changed = false;
  const next = new Map<string, DeniedMark>();
  for (const [key, mark] of marks) {
    const session = byKey.get(key);
    if (session === undefined || session.state === "starting") {
      changed = true;
    } else if (needsYou(session.state)) {
      if (mark.left || session.waitingSince !== mark.waitingSince) changed = true;
      else next.set(key, mark);
    } else if (mark.left) {
      next.set(key, mark);
    } else {
      changed = true;
      next.set(key, { ...mark, left: true });
    }
  }
  return changed ? next : marks;
}
