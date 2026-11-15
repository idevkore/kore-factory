import type { IslandSession } from "../core/contract";
import { stateLabel } from "../core/state";
import { capitalized, type IslandWording } from "./wording";

/**
 * The scene as text. A canvas is opaque to screen readers and tests, so this
 * hidden list carries one item per session figure and one per carrier in flight.
 */
export function IslandMirror(props: {
  readonly sessions: ReadonlyArray<IslandSession>;
  readonly flights: ReadonlySet<string>;
  readonly wording: IslandWording;
}) {
  const { nouns, stationLabels } = props.wording;
  return (
    <ul aria-label="Island sessions" className="sr-only">
      {props.sessions.map((session) =>
        props.flights.has(session.key) ? (
          <li key={session.key} data-carrier-for={session.key} data-station={session.station}>
            {capitalized(nouns.carrier)} in flight: {session.title}, landing at the{" "}
            {stationLabels[session.station]}
          </li>
        ) : (
          <li
            key={session.key}
            data-session-key={session.key}
            data-state={session.state}
            data-station={session.station}
          >
            {session.title}: {stateLabel(session.state)}, at the {stationLabels[session.station]}
          </li>
        ),
      )}
    </ul>
  );
}
