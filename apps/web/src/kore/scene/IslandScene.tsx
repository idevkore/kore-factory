import { Canvas, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { PerspectiveCamera } from "three";

import type { IslandSession } from "../core/contract";
import { layoutSessions, STATION_POSITIONS } from "../core/layout";
import { fitIslandCamera } from "./camera";
import { CommanderFigure } from "./CommanderFigure";
import { Ground } from "./Ground";
import { KeeperFigures } from "./KeeperFigures";
import { SessionPiece } from "./SessionPiece";
import { StationShapes } from "./StationShapes";
import { currentTheme } from "./theme";

/** Refits the fixed camera on frames the on-demand loop draws, when the canvas size changed. */
function IslandCamera(props: { readonly coveredRight: number }) {
  const appliedSize = useRef("");
  useFrame((state) => {
    const { width, height } = state.size;
    const sizeKey = `${width}x${height}x${props.coveredRight}`;
    if (appliedSize.current === sizeKey || width === 0 || height === 0) return;
    appliedSize.current = sizeKey;
    fitIslandCamera(state.camera as PerspectiveCamera, width, height, props.coveredRight);
  });
  return null;
}

export function IslandScene(props: {
  readonly sessions: ReadonlyArray<IslandSession>;
  readonly flights: ReadonlySet<string>;
  readonly focusKey: string | null;
  readonly coveredRight: number;
  readonly onFocus: (key: string) => void;
}) {
  const positions = layoutSessions(props.sessions);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      // `aspect` makes the camera manual, so IslandCamera owns its projection.
      camera={{ fov: 40, near: 1, far: 400, aspect: 1, position: [30, 34, 47] }}
    >
      <color attach="background" args={[currentTheme.palette.background]} />
      <IslandCamera coveredRight={props.coveredRight} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[8, 18, 12]} intensity={1.4} />
      <directionalLight position={[-10, 8, -6]} intensity={0.3} />
      <Ground />
      <StationShapes />
      <CommanderFigure />
      <KeeperFigures />
      {props.sessions.map((session) => (
        <SessionPiece
          key={session.key}
          session={session}
          target={positions.get(session.key) ?? STATION_POSITIONS[session.station]}
          inFlight={props.flights.has(session.key)}
          focused={session.key === props.focusKey}
          onFocus={props.onFocus}
        />
      ))}
    </Canvas>
  );
}
