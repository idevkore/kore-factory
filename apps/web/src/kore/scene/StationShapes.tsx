import { besideStation, facingCentre, STATION_POSITIONS, type Vec3 } from "../core/layout";
import { currentTheme } from "./theme";

const { palette } = currentTheme;

/** The height of the commander's feet on the home shape. */
export const HOME_STAND_HEIGHT = 1.2;

const STEPS: ReadonlyArray<readonly [size: number, y: number]> = [
  [4, 0.2],
  [3, 0.6],
  [2, 1],
];
const COLUMN_X = [-1.5, -0.5, 0.5, 1.5];
const COLUMN_Z = -1.72;

/** A small temple: three steps for the commander, with columns and a pediment behind. */
function HomeShape() {
  const at = STATION_POSITIONS.home;
  return (
    <group position={[at[0], 0, at[2]]} rotation-y={facingCentre(at)}>
      {STEPS.map(([size, y]) => (
        <mesh key={size} position={[0, y, 0]}>
          <boxGeometry args={[size, 0.4, size]} />
          <meshStandardMaterial color={palette.stone} />
        </mesh>
      ))}
      {COLUMN_X.map((x) => (
        <mesh key={x} position={[x, 2, COLUMN_Z]}>
          <cylinderGeometry args={[0.16, 0.18, 3.2, 12]} />
          <meshStandardMaterial color={palette.stone} />
        </mesh>
      ))}
      <mesh position={[0, 3.75, COLUMN_Z]}>
        <boxGeometry args={[3.9, 0.3, 0.6]} />
        <meshStandardMaterial color={palette.stone} />
      </mesh>
      <mesh position={[0, 3.62, COLUMN_Z]}>
        <boxGeometry args={[3.92, 0.06, 0.62]} />
        <meshStandardMaterial color={palette.accent} metalness={0.5} roughness={0.4} />
      </mesh>
      {/* A three-sided prism turned so one edge points up. */}
      <mesh
        position={[0, 4.11, COLUMN_Z]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        scale={[0.45, 1, 0.6]}
      >
        <cylinderGeometry args={[0.7, 0.7, 3.9, 3]} />
        <meshStandardMaterial color={palette.stone} />
      </mesh>
    </group>
  );
}

const CORAL_BRANCHES: ReadonlyArray<{ readonly at: Vec3; readonly tilt: number }> = [
  { at: [-0.6, 0.22, 0.3], tilt: 0.45 },
  { at: [0.5, 0.2, -0.38], tilt: -0.4 },
  { at: [-0.35, 0.2, -0.42], tilt: 0.3 },
  { at: [0.62, 0.18, 0.32], tilt: -0.5 },
];

/** A coral rock shaped like an anvil, with branches of coral round its foot. */
function WorkShape() {
  const [x, , z] = STATION_POSITIONS.work;
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.3, 0]} scale={[1, 0.75, 0.8]}>
        <dodecahedronGeometry args={[0.5]} />
        <meshStandardMaterial color={palette.coral} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[1.3, 0.22, 0.55]} />
        <meshStandardMaterial color={palette.coral} roughness={0.8} />
      </mesh>
      <mesh position={[0.8, 0.72, 0]} rotation-z={-Math.PI / 2}>
        <coneGeometry args={[0.11, 0.3, 10]} />
        <meshStandardMaterial color={palette.coral} roughness={0.8} />
      </mesh>
      {CORAL_BRANCHES.map((branch) => (
        <mesh key={branch.at.join(",")} position={branch.at} rotation-z={branch.tilt}>
          <cylinderGeometry args={[0.03, 0.05, 0.5, 6]} />
          <meshStandardMaterial color={palette.coral} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Angles round the intake keeper, leaving open the side the camera looks from. */
const KELP_AROUND_KEEPER: ReadonlyArray<readonly [angle: number, height: number]> = [
  [2, 1.5],
  [2.8, 1.9],
  [3.6, 1.3],
  [4.4, 1.8],
  [5.2, 1.4],
  [6, 1.7],
];

/** A pool of shallow water with kelp stalks round the keeper's spot. */
function IntakeShape() {
  const [x, , z] = STATION_POSITIONS.intake;
  const [kx, , kz] = besideStation("intake", 1.6);
  const stalks: ReadonlyArray<{ readonly at: Vec3; readonly height: number }> = [
    ...KELP_AROUND_KEEPER.map(([angle, height]) => ({
      at: [kx + 0.6 * Math.cos(angle), 0, kz + 0.6 * Math.sin(angle)] as const,
      height,
    })),
    { at: [x - 0.9, 0, z + 0.2], height: 1.2 },
    { at: [x + 0.7, 0, z - 0.7], height: 1 },
  ];
  return (
    <group>
      <mesh position={[x, 0.012, z]}>
        <cylinderGeometry args={[1.4, 1.4, 0.02, 40]} />
        <meshStandardMaterial color={palette.shallows} roughness={0.4} />
      </mesh>
      {stalks.map((stalk) => (
        <group key={stalk.at.join(",")} position={stalk.at}>
          <mesh position={[0, stalk.height / 2, 0]}>
            <cylinderGeometry args={[0.03, 0.05, stalk.height, 6]} />
            <meshStandardMaterial color={palette.kelp} />
          </mesh>
          <mesh
            position={[0.08, stalk.height * 0.7, 0]}
            rotation-z={-0.4}
            scale={[0.12, 0.32, 0.04]}
          >
            <sphereGeometry args={[1, 10, 8]} />
            <meshStandardMaterial color={palette.kelp} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const LIGHTHOUSE_ROCKS: ReadonlyArray<{ readonly at: Vec3; readonly size: number }> = [
  { at: [-0.85, 0.15, 0.35], size: 0.42 },
  { at: [-0.45, 0.12, -0.85], size: 0.38 },
  { at: [0.35, 0.12, -0.95], size: 0.34 },
  { at: [0.95, 0.12, -0.2], size: 0.36 },
];

/** A short lighthouse on a few rocks; its keeper waits at the foot. */
function GateShape() {
  const [x, , z] = STATION_POSITIONS.gate;
  return (
    <group position={[x, 0, z]}>
      {LIGHTHOUSE_ROCKS.map((rock) => (
        <mesh key={rock.at.join(",")} position={rock.at}>
          <dodecahedronGeometry args={[rock.size]} />
          <meshStandardMaterial color={palette.rock} roughness={1} />
        </mesh>
      ))}
      <mesh position={[0, 1.7, 0]}>
        <cylinderGeometry args={[0.5, 0.72, 3, 20]} />
        <meshStandardMaterial color={palette.stone} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.64, 0.67, 0.3, 20]} />
        <meshStandardMaterial color={palette.stoneBand} />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <cylinderGeometry args={[0.55, 0.58, 0.3, 20]} />
        <meshStandardMaterial color={palette.stoneBand} />
      </mesh>
      <mesh position={[0, 3.25, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.1, 20]} />
        <meshStandardMaterial color={palette.iron} />
      </mesh>
      <mesh position={[0, 3.55, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.5, 16]} />
        <meshStandardMaterial
          color={palette.lamp}
          emissive={palette.lamp}
          emissiveIntensity={0.6}
        />
      </mesh>
      <mesh position={[0, 4.05, 0]}>
        <coneGeometry args={[0.5, 0.5, 16]} />
        <meshStandardMaterial color={palette.iron} />
      </mesh>
    </group>
  );
}

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
