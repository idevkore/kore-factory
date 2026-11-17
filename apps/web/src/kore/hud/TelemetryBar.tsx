import type { IslandWorld } from "../core/contract";
import { islandTotals, longestWait } from "./totals";

function Figure(props: { readonly label: string; readonly value: string | number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-muted-foreground">{props.label}</dt>
      <dd className="font-medium tabular-nums">{props.value}</dd>
    </div>
  );
}

/** The active world's name, then figures counted across every world. */
export function TelemetryBar(props: {
  readonly worlds: ReadonlyArray<IslandWorld>;
  readonly worldName: string;
  readonly nowMs: number;
}) {
  const totals = islandTotals(props.worlds);
  return (
    <section
      aria-label="Island telemetry"
      className="pointer-events-auto flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border bg-background/95 px-4 py-2"
    >
      <h1 className="font-semibold text-base">{props.worldName}</h1>
      <dl className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-xs">
        <Figure label="Working" value={totals.working} />
        <Figure label="Needs you" value={totals.waiting} />
        <Figure label="Sessions" value={totals.sessions} />
        <Figure label="Longest wait" value={longestWait(totals.oldestWaitingSince, props.nowMs)} />
      </dl>
    </section>
  );
}
