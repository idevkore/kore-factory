import { Canvas } from "@react-three/fiber";

import type { CameraPreset, IslandSession, SessionState } from "../core/contract";
import { layoutSessions } from "../core/layout";
import { CommanderFigure } from "./CommanderFigure";
import { Ground } from "./Ground";
import { IslandCamera } from "./IslandCamera";
import { KeeperFigures } from "./KeeperFigures";
import { Scenery } from "./Scenery";
import { SessionPiece } from "./SessionPiece";
import { StationShapes } from "./StationShapes";
import { StationStack } from "./StationStack";
import { currentTheme } from "./theme";

export function IslandScene(props: {
  readonly sessions: ReadonlyArray<IslandSession>;
  readonly flights: ReadonlySet<string>;
  readonly focusKey: string | null;
  readonly coveredRight: number;
  /** Pixels of the canvas's left, top and bottom edges the panel covers; 0 when left out. */
  readonly coveredLeft?: number;
  readonly coveredTop?: number;
  readonly coveredBottom?: number;
  readonly camera: CameraPreset;
  readonly onFocus: (key: string) => void;
}) {
  const { standing, stacks } = layoutSessions(props.sessions, props.focusKey);
  const focused = props.sessions.find((session) => session.key === props.focusKey);
  const states = new Map(props.sessions.map((session) => [session.key, session.state]));
  const stateOf = (key: string): SessionState => states.get(key) ?? "idle";
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      // `aspect` makes the camera manual, so IslandCamera owns its projection.
      camera={{ fov: 40, near: 1, far: 400, aspect: 1, position: [30, 34, 47] }}
    >
      <color attach="background" args={[currentTheme.palette.background]} />
      <IslandCamera
        preset={props.camera}
        station={focused?.station ?? "gate"}
        covered={{
          left: props.coveredLeft ?? 0,
          right: props.coveredRight,
          top: props.coveredTop ?? 0,
          bottom: props.coveredBottom ?? 0,
        }}
      />
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 18, 12]} intensity={1.4} />
      <directionalLight position={[-10, 8, -6]} intensity={0.3} />
      <Ground />
      <StationShapes />
      <CommanderFigure />
      <KeeperFigures />
      <Scenery />
      {props.sessions.map((session) => {
        const target = standing.get(session.key);
        return target === undefined ? null : (
          <SessionPiece
            key={session.key}
            session={session}
            target={target}
            inFlight={props.flights.has(session.key)}
            focused={session.key === props.focusKey}
            onFocus={props.onFocus}
          />
        );
      })}
      {stacks.map((stack) => (
        <StationStack key={stack.station} stack={stack} stateOf={stateOf} onFocus={props.onFocus} />
      ))}
    </Canvas>
  );
}
