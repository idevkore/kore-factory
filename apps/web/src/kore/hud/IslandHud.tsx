import { Badge } from "../../components/ui/badge";
import type {
  CameraPreset,
  IslandSession,
  IslandWorld,
  PendingRequest,
  Resolution,
} from "../core/contract";
import { waitingSessions } from "../core/navigation";
import { formatWaited, stateLabel } from "../core/state";
import { CameraDock } from "./CameraDock";
import { Inspector } from "./Inspector";
import { TelemetryBar } from "./TelemetryBar";
import type { IslandWording } from "./wording";
import { WorldRail, WorldRow } from "./WorldRail";

/**
 * Cards over the canvas: telemetry along the top, worlds on the left, the panel
 * on the right, cameras and keys along the bottom. Nothing spans the gaps, so a
 * click between the cards reaches the canvas.
 */
export function IslandHud(props: {
  readonly worlds: ReadonlyArray<IslandWorld>;
  readonly activeWorldId: string | null;
  readonly ready: boolean;
  readonly worldsError: string | null;
  readonly wording: IslandWording;
  readonly nowMs: number;
  readonly focused: IslandSession | null;
  readonly pending: PendingRequest | null;
  readonly pendingLoading: boolean;
  readonly camera: CameraPreset;
  readonly onFocus: (key: string) => void;
  readonly onSelectWorld: (worldId: string) => void;
  readonly onCamera: (camera: CameraPreset) => void;
  readonly onResolve: (
    sessionKey: string,
    requestId: string,
    resolution: Resolution,
  ) => Promise<void>;
  readonly onOpenInConsole: (sessionKey: string) => void;
}) {
  const { worlds, focused } = props;
  const world = worlds.find((entry) => entry.id === props.activeWorldId) ?? null;
  const worldName = world?.name ?? props.wording.worldName;
  const waiting = waitingSessions(world?.sessions ?? []);
  const multipleWorlds = worlds.length > 1;
  return (
    <>
      <TelemetryBar worlds={worlds} worldName={worldName} nowMs={props.nowMs} />

      {multipleWorlds ? (
        <WorldRail
          worlds={worlds}
          activeWorldId={world?.id ?? null}
          nowMs={props.nowMs}
          onSelectWorld={props.onSelectWorld}
        />
      ) : null}

      <aside
        aria-label="Island panel"
        className="absolute inset-y-0 right-0 flex w-96 max-w-full flex-col gap-6 overflow-y-auto border-l bg-background/95 p-4"
      >
        {multipleWorlds ? (
          <WorldRow
            worlds={worlds}
            activeWorldId={world?.id ?? null}
            onSelectWorld={props.onSelectWorld}
          />
        ) : null}
        {props.worldsError === null ? null : (
          <p className="text-muted-foreground text-xs">{props.worldsError}</p>
        )}

        <section aria-labelledby="island-needs-you" className="flex flex-col gap-2">
          <h2 id="island-needs-you" className="flex items-center gap-2 font-medium text-sm">
            Needs you
            <Badge variant={waiting.length > 0 ? "error" : "secondary"}>{waiting.length}</Badge>
          </h2>
          {!props.ready ? (
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
                    className="flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring aria-[current=true]:bg-accent"
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
          <Inspector
            session={focused}
            worldName={worlds.find((entry) => entry.id === focused.worldId)?.name ?? worldName}
            stationLabel={props.wording.stationLabels[focused.station]}
            nowMs={props.nowMs}
            pending={props.pending}
            pendingLoading={props.pendingLoading}
            onResolve={(requestId, resolution) =>
              props.onResolve(focused.key, requestId, resolution)
            }
            onOpenInConsole={() => props.onOpenInConsole(focused.key)}
          />
        )}
      </aside>

      <CameraDock camera={props.camera} multipleWorlds={multipleWorlds} onCamera={props.onCamera} />
    </>
  );
}
