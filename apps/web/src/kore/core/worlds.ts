import type { IslandWorld } from "./contract";
import { nextWaiting, waitingSessions } from "./navigation";
import { selectVisibleSessions, type VisibilityCandidate } from "./visibility";

/** One rule from the worlds file: a world and the projects it holds. */
export interface WorldRule {
  readonly id: string;
  readonly name: string;
  /** Project-title patterns; `*` is the only wildcard. */
  readonly projects: ReadonlyArray<string>;
  /** Absolute workspace-root prefixes, matched on whole path segments. */
  readonly paths: ReadonlyArray<string>;
}

export interface WorldProject {
  readonly title: string;
  readonly workspaceRoot: string | null;
}

/** Projects no rule matches. Listed last, and only while it has sessions. */
export const UNSORTED_WORLD = { id: "unsorted", name: "Unsorted" } as const;
/** The one world when there are no rules. */
export const ALL_WORLD_ID = "all";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Case-insensitive, against the whole title. */
export function titleMatches(pattern: string, title: string): boolean {
  const source = pattern.split("*").map(escapeRegExp).join(".*");
  return new RegExp(`^${source}$`, "is").test(title);
}

/** Case-sensitive, on whole segments: `/a/b` holds `/a/b` and `/a/b/c`, not `/a/bc`. */
export function pathMatches(prefix: string, workspaceRoot: string): boolean {
  if (prefix.trim() === "") return false;
  const base = prefix.replace(/\/+$/, "");
  const root = workspaceRoot.replace(/\/+$/, "");
  return root === base || root.startsWith(`${base}/`);
}

/** The first rule in file order that matches the project, by title or by path. */
export function worldIdFor(rules: ReadonlyArray<WorldRule>, project: WorldProject): string {
  if (rules.length === 0) return ALL_WORLD_ID;
  const { workspaceRoot } = project;
  const rule = rules.find(
    (candidate) =>
      candidate.projects.some((pattern) => titleMatches(pattern, project.title)) ||
      (workspaceRoot !== null && candidate.paths.some((path) => pathMatches(path, workspaceRoot))),
  );
  return rule?.id ?? UNSORTED_WORLD.id;
}

function toWorld(
  id: string,
  name: string,
  candidates: ReadonlyArray<VisibilityCandidate>,
  nowMs: number,
): IslandWorld {
  const sessions = selectVisibleSessions(candidates, nowMs);
  const waiting = waitingSessions(sessions);
  const oldest = waiting[0];
  return {
    id,
    name,
    sessions,
    working: sessions.filter(({ state }) => state === "starting" || state === "working").length,
    waiting: waiting.length,
    oldestWaitingSince: oldest === undefined ? null : (oldest.waitingSince ?? oldest.updatedAt),
    usage: null,
  };
}

/**
 * The island's worlds: one per rule in file order, then Unsorted when it has
 * visible sessions. With no rules, one world holding everything. Each
 * candidate's session carries the `worldId` that `worldIdFor` gave it.
 */
export function buildWorlds(input: {
  readonly rules: ReadonlyArray<WorldRule>;
  readonly candidates: ReadonlyArray<VisibilityCandidate>;
  readonly nowMs: number;
  readonly defaultName: string;
}): IslandWorld[] {
  const { rules, candidates, nowMs } = input;
  if (rules.length === 0) return [toWorld(ALL_WORLD_ID, input.defaultName, candidates, nowMs)];
  const byWorld = new Map<string, VisibilityCandidate[]>();
  for (const candidate of candidates) {
    const group = byWorld.get(candidate.session.worldId);
    if (group === undefined) byWorld.set(candidate.session.worldId, [candidate]);
    else group.push(candidate);
  }
  const listed = new Set<string>();
  const worlds: IslandWorld[] = [];
  for (const rule of rules) {
    if (listed.has(rule.id)) continue;
    listed.add(rule.id);
    worlds.push(toWorld(rule.id, rule.name, byWorld.get(rule.id) ?? [], nowMs));
  }
  if (!listed.has(UNSORTED_WORLD.id)) {
    const unsorted = toWorld(
      UNSORTED_WORLD.id,
      UNSORTED_WORLD.name,
      byWorld.get(UNSORTED_WORLD.id) ?? [],
      nowMs,
    );
    if (unsorted.sessions.length > 0) worlds.push(unsorted);
  }
  return worlds;
}

/**
 * The waiting session after `focusKey` across every world, oldest first and
 * wrapping round; the oldest when `focusKey` is not waiting. Null when nothing waits.
 */
export function nextWaitingAcrossWorlds(
  worlds: ReadonlyArray<IslandWorld>,
  focusKey: string | null,
): { readonly worldId: string; readonly key: string } | null {
  const worldOf = new Map(
    worlds.flatMap((world) => world.sessions.map((session) => [session.key, world.id] as const)),
  );
  const key = nextWaiting(
    worlds.flatMap((world) => world.sessions),
    focusKey,
  );
  const worldId = key === null ? undefined : worldOf.get(key);
  return key === null || worldId === undefined ? null : { worldId, key };
}
