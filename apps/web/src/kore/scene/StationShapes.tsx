import { besideStation, STATION_POSITIONS, type Vec3 } from "../core/layout";
import { currentTheme } from "./theme";

const { palette } = currentTheme;

/** A stepped platform the commander stands on. */
function HomeShape() {
  const [x, , z] = STATION_POSITIONS.home;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[4, 0.4, 4]} />
        <meshStandardMaterial color={palette.stationBase} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[3, 0.4, 3]} />
        <meshStandardMaterial color={palette.stationBase} />
      </mesh>
      <mesh position={[0, 1, 0]}>
        <boxGeometry args={[2, 0.4, 2]} />
        <meshStandardMaterial color={palette.accent} metalness={0.5} roughness={0.4} />
      </mesh>
    </group>
  );
}

function WorkShape() {
  const [x, , z] = STATION_POSITIONS.work;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.8, 0.44, 0.6]} />
        <meshStandardMaterial color={palette.shade} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <boxGeometry args={[0.44, 0.3, 0.4]} />
        <meshStandardMaterial color={palette.shade} />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <boxGeometry args={[1.5, 0.3, 0.62]} />
        <meshStandardMaterial color={palette.metal} metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}

function IntakeShape() {
  const [cx, , cz] = besideStation("intake", 0.3);
  const blocks: ReadonlyArray<{ readonly at: Vec3; readonly size: number }> = [
    { at: [cx - 0.5, 0.45, cz], size: 0.9 },
    { at: [cx + 0.5, 0.45, cz + 0.1], size: 0.9 },
    { at: [cx, 1.35, cz + 0.05], size: 0.9 },
    { at: [cx + 1.25, 0.3, cz - 0.3], size: 0.6 },
  ];
  return (
    <group>
      {blocks.map((block) => (
        <mesh key={block.at.join(",")} position={block.at}>
          <boxGeometry args={[block.size, block.size, block.size]} />
          <meshStandardMaterial color={palette.stationTrim} />
        </mesh>
      ))}
    </group>
  );
}

/** A raised lookout; its keeper stands on top at `GATE_LOOKOUT_HEIGHT`. */
function GateShape() {
  const [x, , z] = STATION_POSITIONS.gate;
  const legs: ReadonlyArray<readonly [number, number]> = [
    [-0.6, -0.6],
    [0.6, -0.6],
    [-0.6, 0.6],
    [0.6, 0.6],
  ];
  return (
    <group position={[x, 0, z]}>
      {legs.map(([lx, lz]) => (
        <mesh key={`${lx},${lz}`} position={[lx, 2, lz]}>
          <cylinderGeometry args={[0.1, 0.12, 4, 8]} />
          <meshStandardMaterial color={palette.stationTrim} />
        </mesh>
      ))}
      <mesh position={[0, 4.1, 0]}>
        <boxGeometry args={[1.8, 0.2, 1.8]} />
        <meshStandardMaterial color={palette.stationBase} />
      </mesh>
      <mesh position={[0, 5.9, 0]} rotation-y={Math.PI / 4}>
        <coneGeometry args={[1.4, 0.9, 4]} />
        <meshStandardMaterial color={palette.shade} />
      </mesh>
    </group>
  );
}

export const GATE_LOOKOUT_HEIGHT = 4.2;
/** The height of the commander's feet on the home shape. */
export const HOME_STAND_HEIGHT = 1.2;

/** One shape per station. None of them moves. */
export function StationShapes() {
  return (
    <group>
      <HomeShape />
      <WorkShape />
      <IntakeShape />
      <GateShape />
    </group>
  );
}
