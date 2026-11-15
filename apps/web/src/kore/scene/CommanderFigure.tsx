import { STATION_POSITIONS } from "../core/layout";
import { StandingFigure } from "./StandingFigure";
import { HOME_STAND_HEIGHT } from "./StationShapes";
import { currentTheme } from "./theme";

/** The figure on the home station that new sessions' carriers leave from. */
export function CommanderFigure() {
  const [x, , z] = STATION_POSITIONS.home;
  return (
    <StandingFigure
      position={[x, HOME_STAND_HEIGHT, z]}
      body={currentTheme.palette.commander}
      accent={currentTheme.palette.accent}
      scale={1.4}
    />
  );
}
