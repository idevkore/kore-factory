import type { IslandSession } from "../core/contract";
import { stateLabel, stationLabel } from "../core/state";

/**
 * The scene as text. A canvas is opaque to screen readers and tests, so this
 * hidden list carries one item per robot and one per barrel in flight.
 */
export function IslandMirror(props: {
  readonly sessions: ReadonlyArray<IslandSession>;
  readonly flights: ReadonlySet<string>;
}) {
  return (
    <ul aria-label="Island sessions" className="sr-only">
      {props.sessions.map((session) =>
        props.flights.has(session.key) ? (
          <li key={session.key} data-barrel-for={session.key} data-station={session.station}>
            Barrel in flight: {session.title}, landing at the {stationLabel(session.station)}
          </li>
        ) : (
          <li
            key={session.key}
            data-session-key={session.key}
            data-state={session.state}
            data-station={session.station}
          >
            {session.title}: {stateLabel(session.state)}, at the {stationLabel(session.station)}
          </li>
        ),
      )}
    </ul>
  );
}
