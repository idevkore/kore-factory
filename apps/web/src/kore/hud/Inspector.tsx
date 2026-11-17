import { Button } from "../../components/ui/button";
import type { IslandSession, PendingRequest, Resolution } from "../core/contract";
import { formatWaited, needsYou, stateLabel } from "../core/state";
import { RequestForm } from "./RequestForm";

/** The focused session: where it is, how long it has waited, and its open request. */
export function Inspector(props: {
  readonly session: IslandSession;
  readonly worldName: string;
  readonly stationLabel: string;
  readonly nowMs: number;
  readonly pending: PendingRequest | null;
  readonly pendingLoading: boolean;
  readonly onResolve: (requestId: string, resolution: Resolution) => Promise<void>;
  readonly onOpenInConsole: () => void;
}) {
  const { session, pending, nowMs } = props;
  let request = null;
  if (needsYou(session.state)) {
    request = props.pendingLoading ? (
      <p className="text-muted-foreground text-sm">Loading the request…</p>
    ) : pending === null ? (
      <p className="text-muted-foreground text-sm">
        This request can't be shown here. Open the session in the console to answer it.
      </p>
    ) : (
      <RequestForm key={pending.requestId} request={pending} onResolve={props.onResolve} />
    );
  }
  return (
    <section aria-label="Focused session" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="font-medium text-sm">{session.title}</h2>
        <p className="text-muted-foreground text-xs">
          {session.projectTitle} · {props.worldName}
        </p>
        <p className="text-xs">
          {stateLabel(session.state)}, at the {props.stationLabel}
          {session.waitingSince === null
            ? null
            : `, waiting ${formatWaited(session.waitingSince, nowMs)}`}
        </p>
        <p className="text-muted-foreground text-xs">
          Started {formatWaited(session.createdAt, nowMs)} ago · changed{" "}
          {formatWaited(session.updatedAt, nowMs)} ago
        </p>
        {session.lastDecision === "denied" ? (
          <p className="text-destructive-foreground text-xs">Approval denied from the island</p>
        ) : null}
      </div>
      {request}
      <Button variant="outline" onClick={props.onOpenInConsole}>
        Open in console
      </Button>
    </section>
  );
}
