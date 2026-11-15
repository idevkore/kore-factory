import type { StationId } from "../core/contract";
import { besideStation, STATION_POSITIONS, type Vec3 } from "../core/layout";
import { StandingFigure } from "./StandingFigure";
import { GATE_LOOKOUT_HEIGHT } from "./StationShapes";
import { currentTheme } from "./theme";

/** Where each station's keeper stands; the home station has the commander instead. */
const KEEPERS: ReadonlyArray<{
  readonly station: StationId;
  readonly at: Vec3;
  readonly scale: number;
}> = [
  { station: "work", at: besideStation("work", 1.4), scale: 1 },
  { station: "intake", at: besideStation("intake", 1.6), scale: 1 },
  {
    station: "gate",
    at: [STATION_POSITIONS.gate[0], GATE_LOOKOUT_HEIGHT, STATION_POSITIONS.gate[2]],
    scale: 0.9,
  },
];

/** One keeper figure at each station other than home. They do not move. */
export function KeeperFigures() {
  return (
    <group>
      {KEEPERS.map((keeper) => (
        <StandingFigure
          key={keeper.station}
          position={keeper.at}
          body={currentTheme.palette.keeper}
          accent={currentTheme.palette.keeperAccent}
          scale={keeper.scale}
        />
      ))}
    </group>
  );
}
