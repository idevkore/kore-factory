import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Kbd } from "../../components/ui/kbd";
import type { IslandSession, IslandSnapshot, PendingRequest, Resolution } from "../core/contract";
import { waitingSessions } from "../core/navigation";
import { formatWaited, needsYou, stateLabel } from "../core/state";
import { RequestForm } from "./RequestForm";
import type { IslandWording } from "./wording";

function FocusedSession(props: {
  readonly session: IslandSession;
  readonly stationLabel: string;
  readonly nowMs: number;
  readonly pending: PendingRequest | null;
  readonly pendingLoading: boolean;
  readonly onResolve: (requestId: string, resolution: Resolution) => Promise<void>;
  readonly onOpenInConsole: () => void;
}) {
  const { session, pending } = props;
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
        <p className="text-muted-foreground text-xs">{session.projectTitle}</p>
        <p className="text-xs">
          {stateLabel(session.state)}, at the {props.stationLabel}
          {session.waitingSince === null
            ? null
            : `, waiting ${formatWaited(session.waitingSince, props.nowMs)}`}
        </p>
      </div>
      {request}
      <Button variant="outline" onClick={props.onOpenInConsole}>
        Open in console
      </Button>
    </section>
  );
}

export function IslandHud(props: {
  readonly snapshot: IslandSnapshot;
  readonly wording: IslandWording;
  readonly nowMs: number;
  readonly focused: IslandSession | null;
  readonly pending: PendingRequest | null;
  readonly pendingLoading: boolean;
  readonly onFocus: (key: string) => void;
  readonly onResolve: (
    sessionKey: string,
    requestId: string,
    resolution: Resolution,
  ) => Promise<void>;
  readonly onOpenInConsole: (sessionKey: string) => void;
}) {
  const { snapshot, focused } = props;
  const waiting = waitingSessions(snapshot.sessions);
  const working = snapshot.sessions.filter((session) => session.state === "working").length;
  return (
    <aside
      aria-label="Island panel"
      className="absolute inset-y-0 right-0 flex w-96 max-w-full flex-col gap-6 overflow-y-auto border-l bg-background/95 p-4"
    >
      <header className="flex items-baseline justify-between gap-3">
        <h1 className="font-semibold text-base">{props.wording.worldName}</h1>
        <p className="text-muted-foreground text-xs">
          Working {working} · Needs you {waiting.length}
        </p>
      </header>

      <section aria-labelledby="island-needs-you" className="flex flex-col gap-2">
        <h2 id="island-needs-you" className="flex items-center gap-2 font-medium text-sm">
          Needs you
          <Badge variant={waiting.length > 0 ? "error" : "secondary"}>{waiting.length}</Badge>
        </h2>
        {!snapshot.ready ? (
          <p className="text-muted-foreground text-sm">Loading sessions…</p>
        ) : waiting.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing is waiting on you.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {waiting.map((session) => (
              <li key={session.key}>
                <button
                  type="button"
                  aria-current={session.key === focused?.key ? "true" : undefined}
                  className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left hover:bg-accent aria-[current=true]:bg-accent"
                  onClick={() => props.onFocus(session.key)}
                >
                  <span className="text-sm">{session.title}</span>
                  <span className="text-muted-foreground text-xs">
                    {stateLabel(session.state)} · {session.projectTitle} · waiting{" "}
                    {formatWaited(session.waitingSince ?? session.updatedAt, props.nowMs)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {focused === null ? (
        <p className="text-muted-foreground text-sm">
          Click a {props.wording.nouns.figure}, or press N for the next session waiting on you.
        </p>
      ) : (
        <FocusedSession
          session={focused}
          stationLabel={props.wording.stationLabels[focused.station]}
          nowMs={props.nowMs}
          pending={props.pending}
          pendingLoading={props.pendingLoading}
          onResolve={(requestId, resolution) => props.onResolve(focused.key, requestId, resolution)}
          onOpenInConsole={() => props.onOpenInConsole(focused.key)}
        />
      )}

      <footer className="mt-auto flex items-center gap-2 text-muted-foreground text-xs">
        <Kbd>N</Kbd> next waiting
        <Kbd>Esc</Kbd> clear focus
      </footer>
    </aside>
  );
}
