import type { StationId } from "../core/contract";
import { GROUND_SIZE, outwardFrom, STATION_POSITIONS, type Vec3 } from "../core/layout";
import { COLORS } from "./palette";

function besideStation(station: StationId, distance: number, height = 0): Vec3 {
  const [x, , z] = STATION_POSITIONS[station];
  const [outX, outZ] = outwardFrom(station);
  return [x + outX * distance, height, z + outZ * distance];
}

/** Faces a figure standing at `from` towards the island's centre. */
function facingCentre(from: Vec3): number {
  return Math.atan2(-from[0], -from[2]);
}

function Figure(props: {
  readonly position: Vec3;
  readonly body: string;
  readonly accent: string;
  readonly scale?: number;
}) {
  return (
    <group
      position={props.position}
      rotation-y={facingCentre(props.position)}
      scale={props.scale ?? 1}
    >
      <mesh position={[-0.13, 0.22, 0]}>
        <boxGeometry args={[0.16, 0.44, 0.18]} />
        <meshStandardMaterial color={COLORS.iron} />
      </mesh>
      <mesh position={[0.13, 0.22, 0]}>
        <boxGeometry args={[0.16, 0.44, 0.18]} />
        <meshStandardMaterial color={COLORS.iron} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.24, 0.3, 0.6, 12]} />
        <meshStandardMaterial color={props.body} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.7, 0.14, 0.24]} />
        <meshStandardMaterial color={props.accent} />
      </mesh>
      <mesh position={[0, 1.24, 0]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color={props.body} />
      </mesh>
      <mesh position={[0, 1.44, 0]}>
        <boxGeometry args={[0.32, 0.08, 0.32]} />
        <meshStandardMaterial color={props.accent} />
      </mesh>
    </group>
  );
}

function IslandGround() {
  return (
    <group>
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[GROUND_SIZE, 1, GROUND_SIZE]} />
        <meshStandardMaterial color={COLORS.stone} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.6, 0]}>
        <boxGeometry args={[GROUND_SIZE + 0.5, 1, GROUND_SIZE + 0.5]} />
        <meshStandardMaterial color={COLORS.gold} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

function CommandDais() {
  const [x, , z] = STATION_POSITIONS.home;
  return (
    <group>
      <Figure position={[x, 1.2, z]} body={COLORS.steel} accent={COLORS.gold} scale={1.4} />
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[4, 0.4, 4]} />
          <meshStandardMaterial color={COLORS.stoneLight} />
        </mesh>
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[3, 0.4, 3]} />
          <meshStandardMaterial color={COLORS.stoneLight} />
        </mesh>
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[2, 0.4, 2]} />
          <meshStandardMaterial color={COLORS.gold} metalness={0.5} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

function Anvil() {
  const [x, , z] = STATION_POSITIONS.work;
  return (
    <group>
      <group position={[x, 0, z]}>
        <mesh position={[0, 0.22, 0]}>
          <boxGeometry args={[0.8, 0.44, 0.6]} />
          <meshStandardMaterial color={COLORS.iron} />
        </mesh>
        <mesh position={[0, 0.58, 0]}>
          <boxGeometry args={[0.44, 0.3, 0.4]} />
          <meshStandardMaterial color={COLORS.iron} />
        </mesh>
        <mesh position={[0, 0.88, 0]}>
          <boxGeometry args={[1.5, 0.3, 0.62]} />
          <meshStandardMaterial color={COLORS.steel} metalness={0.7} roughness={0.4} />
        </mesh>
      </group>
      <Figure position={besideStation("work", 1.4)} body={COLORS.grey} accent={COLORS.dimGold} />
    </group>
  );
}

function Crates() {
  const [cx, , cz] = besideStation("intake", 0.3);
  const crates: ReadonlyArray<{ readonly at: Vec3; readonly size: number }> = [
    { at: [cx - 0.5, 0.45, cz], size: 0.9 },
    { at: [cx + 0.5, 0.45, cz + 0.1], size: 0.9 },
    { at: [cx, 1.35, cz + 0.05], size: 0.9 },
    { at: [cx + 1.25, 0.3, cz - 0.3], size: 0.6 },
  ];
  return (
    <group>
      {crates.map((crate) => (
        <mesh key={crate.at.join(",")} position={crate.at}>
          <boxGeometry args={[crate.size, crate.size, crate.size]} />
          <meshStandardMaterial color={COLORS.wood} />
        </mesh>
      ))}
      <Figure position={besideStation("intake", 1.6)} body={COLORS.grey} accent={COLORS.dimGold} />
    </group>
  );
}

function Watchtower() {
  const [x, , z] = STATION_POSITIONS.gate;
  const legs: ReadonlyArray<readonly [number, number]> = [
    [-0.6, -0.6],
    [0.6, -0.6],
    [-0.6, 0.6],
    [0.6, 0.6],
  ];
  return (
    <group>
      <Figure position={[x, 4.2, z]} body={COLORS.grey} accent={COLORS.dimGold} scale={0.9} />
      <group position={[x, 0, z]}>
        {legs.map(([lx, lz]) => (
          <mesh key={`${lx},${lz}`} position={[lx, 2, lz]}>
            <cylinderGeometry args={[0.1, 0.12, 4, 8]} />
            <meshStandardMaterial color={COLORS.wood} />
          </mesh>
        ))}
        <mesh position={[0, 4.1, 0]}>
          <boxGeometry args={[1.8, 0.2, 1.8]} />
          <meshStandardMaterial color={COLORS.stoneLight} />
        </mesh>
        <mesh position={[0, 5.9, 0]} rotation-y={Math.PI / 4}>
          <coneGeometry args={[1.4, 0.9, 4]} />
          <meshStandardMaterial color={COLORS.iron} />
        </mesh>
      </group>
    </group>
  );
}

/** The island, its four stations and their figures. None of it moves. */
export function IslandSet() {
  return (
    <group>
      <IslandGround />
      <CommandDais />
      <Anvil />
      <Crates />
      <Watchtower />
    </group>
  );
}
