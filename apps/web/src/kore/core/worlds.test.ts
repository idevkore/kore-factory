import { describe, expect, it } from "vite-plus/test";

import type { IslandSession, IslandWorld, SessionState } from "./contract";
import { stationFor } from "./state";
import { MAX_VISIBLE_SESSIONS } from "./visibility";
import {
  ALL_WORLD_ID,
  buildWorlds,
  nextWaitingAcrossWorlds,
  pathMatches,
  titleMatches,
  UNSORTED_WORLD,
  type WorldRule,
  worldIdFor,
} from "./worlds";

const NOW = Date.parse("2026-01-02T12:00:00.000Z");

function session(
  key: string,
  worldId: string,
  state: SessionState = "idle",
  waitingSince: string | null = null,
): IslandSession {
  return {
    key,
    ref: { environmentId: "env", threadId: key },
    projectId: "project",
    projectTitle: "Sample project",
    title: `Fix login redirect ${key}`,
    state,
    station: stationFor(state),
    createdAt: "2026-01-02T11:00:00.000Z",
    updatedAt: "2026-01-02T11:00:00.000Z",
    waitingSince,
    worldId,
    lastDecision: null,
  };
}

const visible = (sessions: ReadonlyArray<IslandSession>) =>
  sessions.map((entry) => ({ session: entry, archived: false }));

function rule(id: string, lists: Partial<Pick<WorldRule, "projects" | "paths">>): WorldRule {
  return { id, name: `World ${id}`, projects: [], paths: [], ...lists };
}

describe("titleMatches", () => {
  it("matches the whole title, ignoring case, with * as the only wildcard", () => {
    expect(titleMatches("Acme Web", "acme web")).toBe(true);
    expect(titleMatches("Acme", "Acme Web")).toBe(false);
    expect(titleMatches("acme*", "Acme Web")).toBe(true);
    expect(titleMatches("*web*", "The Web Site")).toBe(true);
    expect(titleMatches("a.c?e", "abcde")).toBe(false);
    expect(titleMatches("a.c?e", "A.C?E")).toBe(true);
  });
});

describe("pathMatches", () => {
  it("matches on whole path segments, case-sensitive, ignoring a trailing slash", () => {
    expect(pathMatches("/home/dev/acme", "/home/dev/acme")).toBe(true);
    expect(pathMatches("/home/dev/acme", "/home/dev/acme/web")).toBe(true);
    expect(pathMatches("/home/dev/acme", "/home/dev/acmeco")).toBe(false);
    expect(pathMatches("/home/dev/acme/", "/home/dev/acme")).toBe(true);
    expect(pathMatches("/home/dev/acme", "/home/dev/acme/")).toBe(true);
    expect(pathMatches("/home/dev/Acme", "/home/dev/acme")).toBe(false);
    expect(pathMatches("", "/home/dev/acme")).toBe(false);
  });
});

describe("worldIdFor", () => {
  const rules = [
    rule("web", { projects: ["*site"] }),
    rule("acme", { paths: ["/home/dev/acme"] }),
    rule("late", { projects: ["acme*"] }),
  ];

  it("gives the first world in file order that matches by title or path", () => {
    expect(worldIdFor(rules, { title: "Marketing site", workspaceRoot: null })).toBe("web");
    expect(worldIdFor(rules, { title: "Acme API", workspaceRoot: "/home/dev/acme/api" })).toBe(
      "acme",
    );
    expect(worldIdFor(rules, { title: "Acme site", workspaceRoot: "/home/dev/acme" })).toBe("web");
    expect(worldIdFor(rules, { title: "Acme API", workspaceRoot: "/srv/acme" })).toBe("late");
  });

  it("puts projects no rule matches in Unsorted, and everything in one world without rules", () => {
    expect(worldIdFor(rules, { title: "Other", workspaceRoot: "/srv/other" })).toBe(
      UNSORTED_WORLD.id,
    );
    expect(worldIdFor([], { title: "Other", workspaceRoot: null })).toBe(ALL_WORLD_ID);
  });
});

describe("buildWorlds", () => {
  it("lists every rule's world in file order, empty ones too, and Unsorted last", () => {
    const worlds = buildWorlds({
      rules: [rule("web", {}), rule("api", {}), rule("web", {})],
      candidates: visible([
        session("a", "api", "working"),
        session("b", UNSORTED_WORLD.id),
        session("c", "api", "starting"),
        session("d", "api", "needs_answer", "2026-01-02T11:30:00.000Z"),
        session("e", "api", "needs_approval", "2026-01-02T10:30:00.000Z"),
      ]),
      nowMs: NOW,
      defaultName: "KORE Atoll",
    });
    expect(worlds.map((world) => [world.id, world.name, world.sessions.length])).toEqual([
      ["web", "World web", 0],
      ["api", "World api", 4],
      [UNSORTED_WORLD.id, UNSORTED_WORLD.name, 1],
    ]);
    expect(worlds[1]).toMatchObject({
      working: 2,
      waiting: 2,
      oldestWaitingSince: "2026-01-02T10:30:00.000Z",
      usage: null,
    });
    expect(worlds[0]).toMatchObject({ working: 0, waiting: 0, oldestWaitingSince: null });
  });

  it("leaves Unsorted out when it has no visible sessions", () => {
    const worlds = buildWorlds({
      rules: [rule("web", {})],
      candidates: [{ session: session("old", UNSORTED_WORLD.id), archived: true }],
      nowMs: NOW,
      defaultName: "KORE Atoll",
    });
    expect(worlds.map((world) => world.id)).toEqual(["web"]);
  });

  it("makes one world named by the theme when there are no rules", () => {
    const worlds = buildWorlds({
      rules: [],
      candidates: visible([session("a", ALL_WORLD_ID)]),
      nowMs: NOW,
      defaultName: "KORE Atoll",
    });
    expect(worlds.map((world) => [world.id, world.name, world.sessions.length])).toEqual([
      [ALL_WORLD_ID, "KORE Atoll", 1],
    ]);
  });

  it("caps the visible sessions per world, not across the island", () => {
    const many = (worldId: string) =>
      Array.from({ length: MAX_VISIBLE_SESSIONS + 3 }, (_, index) =>
        session(`${worldId}-${index}`, worldId),
      );
    const worlds = buildWorlds({
      rules: [rule("web", {}), rule("api", {})],
      candidates: visible([...many("web"), ...many("api")]),
      nowMs: NOW,
      defaultName: "KORE Atoll",
    });
    expect(worlds.map((world) => world.sessions.length)).toEqual([
      MAX_VISIBLE_SESSIONS,
      MAX_VISIBLE_SESSIONS,
    ]);
  });
});

describe("nextWaitingAcrossWorlds", () => {
  const world = (id: string, sessions: ReadonlyArray<IslandSession>): IslandWorld => ({
    id,
    name: id,
    sessions,
    working: 0,
    waiting: 0,
    oldestWaitingSince: null,
    usage: null,
  });
  const worlds = [
    world("web", [
      session("newest", "web", "needs_answer", "2026-01-02T11:00:00.000Z"),
      session("busy", "web", "working"),
    ]),
    world("api", [
      session("oldest", "api", "needs_approval", "2026-01-02T09:00:00.000Z"),
      session("middle", "api", "needs_answer", "2026-01-02T10:00:00.000Z"),
    ]),
  ];

  it("starts at the oldest waiting session in any world", () => {
    expect(nextWaitingAcrossWorlds(worlds, null)).toEqual({ worldId: "api", key: "oldest" });
    expect(nextWaitingAcrossWorlds(worlds, "busy")).toEqual({ worldId: "api", key: "oldest" });
  });

  it("moves past the focused session, across worlds, and wraps round", () => {
    expect(nextWaitingAcrossWorlds(worlds, "oldest")).toEqual({ worldId: "api", key: "middle" });
    expect(nextWaitingAcrossWorlds(worlds, "middle")).toEqual({ worldId: "web", key: "newest" });
    expect(nextWaitingAcrossWorlds(worlds, "newest")).toEqual({ worldId: "api", key: "oldest" });
  });

  it("is null when nothing waits", () => {
    expect(nextWaitingAcrossWorlds([world("web", [session("a", "web")])], null)).toBeNull();
  });
});
