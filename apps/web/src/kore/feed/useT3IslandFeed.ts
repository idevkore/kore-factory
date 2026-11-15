import type { EnvironmentThreadShell } from "@t3tools/client-runtime/state/shell";
import {
  isAtomCommandInterrupted,
  squashAtomCommandFailure,
} from "@t3tools/client-runtime/state/runtime";
import {
  derivePendingThreadRequests,
  type PendingThreadRequests,
} from "@t3tools/client-runtime/state/thread-requests";
import { useNavigate } from "@tanstack/react-router";
import * as DateTime from "effect/DateTime";

import { useNowMinute } from "../../hooks/useNowMinute";
import {
  useAllEnvironmentShellsBootstrapped,
  useProjects,
  useQuietThreadProjection,
  useQuietThreadShells,
} from "../../state/entities";
import { threadEnvironment } from "../../state/threads";
import { useOrchestrationCommand } from "../../state/use-orchestration-command";
import { buildThreadRouteParams } from "../../threadRoutes";
import {
  type IslandFeed,
  type IslandSession,
  ISLAND_WORLD,
  type PendingRequest,
  type Resolution,
  type SessionState,
} from "../core/contract";
import { needsYou, sessionStateOf, stationFor } from "../core/state";
import { selectVisibleSessions } from "../core/visibility";

function sessionKeyOf(shell: EnvironmentThreadShell): string {
  return `${shell.environmentId}:${shell.id}`;
}

function toIslandSession(shell: EnvironmentThreadShell, projectTitle: string): IslandSession {
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
  };
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

/** The island's one view of T3: every listed thread as a session, and answers for the focused one. */
export function useT3IslandFeed(focusKey: string | null): IslandFeed {
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

  const projectTitles = new Map(
    projects.map((project) => [`${project.environmentId}:${project.id}`, project.title]),
  );
  const shellsByKey = new Map(shells.map((shell) => [sessionKeyOf(shell), shell]));
  const sessions = selectVisibleSessions(
    shells.map((shell) => ({
      session: toIslandSession(
        shell,
        projectTitles.get(`${shell.environmentId}:${shell.projectId}`) ?? "Unknown project",
      ),
      archived: shell.archivedAt !== null || shell.deletedAt !== null,
    })),
    nowMs,
  );

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
    if (result._tag === "Success") return;
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
    snapshot: { worldId: ISLAND_WORLD.id, ready, sessions },
    pending,
    pendingLoading: detailRef !== null && detail === null,
    resolve,
    openInConsole,
  };
}
