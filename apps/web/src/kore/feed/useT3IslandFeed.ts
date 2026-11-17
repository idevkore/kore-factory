import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import {
  type AtomCommandResult,
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import {
  derivePendingThreadRequests,
  type PendingThreadRequests,
} from "@t3tools/client-runtime/state/thread-requests";
import type { EnvironmentId, KoreWorldsResponse } from "@t3tools/contracts";
import { useNavigate } from "@tanstack/react-router";
import * as DateTime from "effect/DateTime";
import { useEffect, useEffectEvent, useState } from "react";

import { useNowMinute } from "../../hooks/useNowMinute";
import {
  useAllEnvironmentShellsBootstrapped,
  useProjects,
  useQuietThreadProjection,
  useQuietThreadShells,
} from "../../state/entities";
import { useConnectedEnvironmentIds, usePrimaryEnvironmentId } from "../../state/environments";
import { useAtomCommand } from "../../state/use-atom-command";
import { threadEnvironment } from "../../state/threads";
import { useOrchestrationCommand } from "../../state/use-orchestration-command";
import { buildThreadRouteParams } from "../../threadRoutes";
import type {
  IslandFeed,
  IslandSession,
  PendingRequest,
  Resolution,
  SessionState,
} from "../core/contract";
import { clearDenied, type DeniedMarks, markDenied, reconcileDenied } from "../core/denied";
import { needsYou, sessionStateOf, stationFor } from "../core/state";
import {
  INITIAL_WORLD_RULES,
  nextWorldRules,
  type WorldRulesEvent,
  type WorldRulesState,
} from "../core/worldRules";
import { buildWorlds, worldIdFor } from "../core/worlds";
import { readKoreWorlds } from "./koreWorlds";

function sessionKeyOf(shell: EnvironmentThreadShell): string {
  return `${shell.environmentId}:${shell.id}`;
}

function toIslandSession(
  shell: EnvironmentThreadShell,
  projectTitle: string,
  worldId: string,
): IslandSession {
  const state = sessionStateOf({
    status: shell.runtime?.status ?? null,
    hasPendingApprovals: shell.hasPendingApprovals,
    hasPendingUserInput: shell.hasPendingUserInput,
  });
  const requestedAt = shell.source.pendingRuntimeRequest?.createdAt;
  return {
    key: sessionKeyOf(shell),
    ref: { environmentId: shell.environmentId, threadId: shell.id },
    projectId: shell.projectId,
    projectTitle,
    title: shell.title,
    state,
    station: stationFor(state),
    createdAt: shell.createdAt,
    updatedAt: shell.updatedAt,
    waitingSince: needsYou(state)
      ? requestedAt === undefined
        ? (shell.pendingUserInputAt ?? shell.updatedAt)
        : DateTime.formatIso(requestedAt)
      : null,
    worldId,
    lastDecision: null,
  };
}

/** Settles a load whose request never answers, so the optional file cannot hold the island back. */
const WORLD_RULES_SETTLE_MS = 20_000;

function worldRulesEvent(
  target: EnvironmentId,
  result: AtomCommandResult<KoreWorldsResponse, unknown>,
): WorldRulesEvent {
  if (result._tag === "Success") return { type: "loaded", target, rules: result.value.worlds };
  if (isAtomCommandInterrupted(result)) return { type: "interrupted", target };
  const error = squashAtomCommandFailure(result);
  return {
    type: "failed",
    target,
    message: `The world rules could not be loaded: ${
      error instanceof Error ? error.message : "unknown error"
    }`,
  };
}

/** The world rules, from the environment the island is connected to, loaded again when that changes. */
function useWorldRules(): WorldRulesState {
  const primary = usePrimaryEnvironmentId();
  const connected = useConnectedEnvironmentIds();
  const environmentId =
    primary !== null && connected.includes(primary) ? primary : (connected[0] ?? null);
  const [stored, setStored] = useState(INITIAL_WORLD_RULES);
  const state = nextWorldRules(stored, { type: "target", target: environmentId });
  if (state !== stored) setStored(state);
  const read = useAtomCommand(readKoreWorlds, { reportFailure: false });
  const requestRules = useEffectEvent((target: EnvironmentId) => read({ environmentId: target }));
  const loadingTarget =
    state.result.status === "loading" && state.target === environmentId ? environmentId : null;
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Reads the rules file from the server whenever the environment to read it from changes.
  useEffect(() => {
    if (loadingTarget === null) return;
    const dispatch = (event: WorldRulesEvent) =>
      setStored((current) => nextWorldRules(current, event));
    const timer = setTimeout(
      () =>
        dispatch({
          type: "failed",
          target: loadingTarget,
          message: "The world rules could not be loaded: the server did not answer.",
        }),
      WORLD_RULES_SETTLE_MS,
    );
    void requestRules(loadingTarget).then((result) => {
      clearTimeout(timer);
      dispatch(worldRulesEvent(loadingTarget, result));
    });
    return () => clearTimeout(timer);
  }, [loadingTarget]);
  return state;
}

function toPendingRequest(
  state: SessionState,
  requests: PendingThreadRequests,
): PendingRequest | null {
  const approval = requests.approvals[0];
  const input = requests.userInputs[0];
  if (approval !== undefined && (state === "needs_approval" || input === undefined)) {
    return {
      kind: "approval",
      requestId: approval.requestId,
      prompt:
        approval.detail ??
        approval.reason ??
        `The agent asks to run a ${approval.requestKind.replaceAll("_", " ")} action.`,
      answerable: approval.responseCapability === "live",
      acceptsNote: approval.supportsFeedback === true,
    };
  }
  if (input === undefined) return null;
  return {
    kind: "question",
    requestId: input.requestId,
    questions: input.questions.map((question) => ({
      id: question.id,
      header: question.header,
      question: question.question,
      options: question.options.map((option) => ({
        label: option.label,
        description: option.description,
        value: option.value ?? option.label,
      })),
      allowCustomAnswer: question.allowCustomAnswer !== false,
      multiSelect: question.multiSelect,
    })),
    answerable: input.responseCapability === "live",
  };
}

/** The island's one view of T3: every listed thread as a session in its world, and answers for the focused one. */
export function useT3IslandFeed(focusKey: string | null, defaultWorldName: string): IslandFeed {
  const shells = useQuietThreadShells();
  const projects = useProjects();
  const ready = useAllEnvironmentShellsBootstrapped();
  const nowMs = Date.parse(`${useNowMinute()}Z`);
  const navigate = useNavigate();
  const respondToApproval = useOrchestrationCommand(threadEnvironment.respondToApproval, {
    reportFailure: false,
  });
  const respondToUserInput = useOrchestrationCommand(threadEnvironment.respondToUserInput, {
    reportFailure: false,
  });

  const worldRules = useWorldRules();
  const rules = worldRules.result.status === "loaded" ? worldRules.result.rules : [];
  const [deniedMarks, setDeniedMarks] = useState<DeniedMarks>(() => new Map());

  const projectsByKey = new Map(
    projects.map((project) => [`${project.environmentId}:${project.id}`, project]),
  );
  const shellsByKey = new Map(shells.map((shell) => [sessionKeyOf(shell), shell]));
  const candidates = shells.map((shell) => {
    const project = projectsByKey.get(`${shell.environmentId}:${shell.projectId}`);
    const projectTitle = project?.title ?? "Unknown project";
    const worldId = worldIdFor(rules, {
      title: projectTitle,
      workspaceRoot: project?.workspaceRoot ?? null,
    });
    return {
      session: toIslandSession(shell, projectTitle, worldId),
      archived: shell.archivedAt !== null || shell.deletedAt !== null,
    };
  });
  const listed = candidates.flatMap(({ session, archived }) => (archived ? [] : [session]));
  const marks = reconcileDenied(deniedMarks, listed);
  if (marks !== deniedMarks) setDeniedMarks(marks);
  const worlds = buildWorlds({
    rules,
    candidates: candidates.map((candidate) =>
      marks.has(candidate.session.key)
        ? { ...candidate, session: { ...candidate.session, lastDecision: "denied" as const } }
        : candidate,
    ),
    nowMs,
    defaultName: defaultWorldName,
  });
  const sessions = worlds.flatMap((world) => world.sessions);

  const focused = sessions.find((session) => session.key === focusKey) ?? null;
  const focusedShell = focused === null ? undefined : shellsByKey.get(focused.key);
  // Only a focused session that waits on the user opens its thread stream.
  const detailRef =
    focused !== null && focusedShell !== undefined && needsYou(focused.state)
      ? { environmentId: focusedShell.environmentId, threadId: focusedShell.id }
      : null;
  const detail = useQuietThreadProjection(detailRef);
  const requests = detail === null ? null : derivePendingThreadRequests(detail.projection);
  const pending =
    focused === null || requests === null ? null : toPendingRequest(focused.state, requests);

  const resolve = async (sessionKey: string, requestId: string, resolution: Resolution) => {
    const shell = shellsByKey.get(sessionKey);
    const approval = requests?.approvals.find((entry) => entry.requestId === requestId);
    const input = requests?.userInputs.find((entry) => entry.requestId === requestId);
    if (shell === undefined || sessionKey !== focusKey || (!approval && !input)) {
      throw new Error("This request is no longer open.");
    }
    const target = { environmentId: shell.environmentId };
    let result;
    if (resolution.kind === "answer") {
      if (input === undefined) throw new Error("This request is not a question.");
      result = await respondToUserInput({
        ...target,
        input: { threadId: shell.id, requestId: input.requestId, answers: resolution.answers },
      });
    } else {
      if (approval === undefined) throw new Error("This request is not an approval.");
      const note = resolution.kind === "deny" ? resolution.note?.trim() : undefined;
      result = await respondToApproval({
        ...target,
        input: {
          threadId: shell.id,
          requestId: approval.requestId,
          decision: resolution.kind === "approve" ? "accept" : "decline",
          ...(note && approval.supportsFeedback ? { feedback: note } : {}),
        },
      });
    }
    if (result._tag === "Success") {
      const waitingSince = sessions.find((session) => session.key === sessionKey)?.waitingSince;
      setDeniedMarks((current) =>
        resolution.kind === "deny"
          ? markDenied(current, { key: sessionKey, waitingSince: waitingSince ?? null })
          : clearDenied(current, sessionKey),
      );
      return;
    }
    const error = isAtomCommandInterrupted(result) ? null : squashAtomCommandFailure(result);
    throw new Error(error instanceof Error ? error.message : "The answer was not sent.");
  };

  const openInConsole = (sessionKey: string) => {
    const shell = shellsByKey.get(sessionKey);
    if (shell === undefined) return;
    void navigate({
      to: "/$environmentId/$threadId",
      params: buildThreadRouteParams({ environmentId: shell.environmentId, threadId: shell.id }),
    });
  };

  return {
    snapshot: { ready: ready && worldRules.result.status !== "loading", worlds },
    pending,
    pendingLoading: detailRef !== null && detail === null,
    worldsError: worldRules.result.status === "failed" ? worldRules.result.message : null,
    resolve,
    openInConsole,
  };
}
