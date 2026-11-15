import type { ReactNode } from "react";

import { besideStation, facingCentre, type Vec3 } from "../core/layout";
import { currentTheme, type KeeperStation } from "./theme";

const { palette } = currentTheme;

/** A keeper upright on her tail, facing the centre, with long hair and `held` in her right hand. */
function Keeper(props: {
  readonly position: Vec3;
  readonly tail: string;
  readonly held: ReactNode;
}) {
  const tail = <meshStandardMaterial color={props.tail} />;
  const skin = <meshStandardMaterial color={palette.skin} />;
  return (
    <group position={props.position} rotation-y={facingCentre(props.position)}>
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[side * 0.13, 0.05, 0.04]}
          rotation={[0, side * 0.35, side * 0.3]}
        >
          <boxGeometry args={[0.26, 0.04, 0.14]} />
          {tail}
        </mesh>
      ))}
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.15, 0.05, 0.54, 12]} />
        {tail}
      </mesh>
      <mesh position={[0, 0.76, 0]}>
        <cylinderGeometry args={[0.21, 0.15, 0.34, 14]} />
        {tail}
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.36, 14]} />
        {skin}
      </mesh>
      <mesh position={[0, 1.13, 0]}>
        <cylinderGeometry args={[0.178, 0.19, 0.14, 14]} />
        <meshStandardMaterial color={palette.wrap} />
      </mesh>
      <mesh position={[-0.24, 1.05, 0]} rotation-z={0.15}>
        <cylinderGeometry args={[0.045, 0.05, 0.42, 8]} />
        {skin}
      </mesh>
      <mesh position={[0.24, 1.05, 0.06]} rotation={[-0.4, 0, -0.15]}>
        <cylinderGeometry args={[0.045, 0.05, 0.42, 8]} />
        {skin}
      </mesh>
      <mesh position={[0, 1.45, 0]}>
        <sphereGeometry args={[0.15, 16, 12]} />
        {skin}
      </mesh>
      <mesh position={[0, 1.47, -0.015]}>
        <sphereGeometry args={[0.162, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={palette.hair} />
      </mesh>
      <mesh position={[0, 1.2, -0.1]}>
        <cylinderGeometry args={[0.13, 0.17, 0.55, 12]} />
        <meshStandardMaterial color={palette.hair} />
      </mesh>
      <group position={[0.3, 0.86, 0.14]}>{props.held}</group>
    </group>
  );
}

function Basket() {
  return (
    <group>
      <mesh position={[0, -0.08, 0]}>
        <cylinderGeometry args={[0.16, 0.12, 0.2, 12]} />
        <meshStandardMaterial color={palette.wood} roughness={1} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <torusGeometry args={[0.13, 0.015, 6, 16, Math.PI]} />
        <meshStandardMaterial color={palette.wood} roughness={1} />
      </mesh>
    </group>
  );
}

function Hammer() {
  return (
    <group>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.022, 0.022, 0.46, 6]} />
        <meshStandardMaterial color={palette.wood} />
      </mesh>
      <mesh position={[0, 0.35, 0]}>
        <boxGeometry args={[0.2, 0.1, 0.1]} />
        <meshStandardMaterial color={palette.iron} metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function Lantern() {
  return (
    <group position={[0, -0.12, 0]}>
      <mesh position={[0, -0.11, 0]}>
        <boxGeometry args={[0.16, 0.03, 0.16]} />
        <meshStandardMaterial color={palette.iron} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.13, 0.18, 0.13]} />
        <meshStandardMaterial
          color={palette.lamp}
          emissive={palette.lamp}
          emissiveIntensity={0.8}
        />
      </mesh>
      <mesh position={[0, 0.13, 0]}>
        <coneGeometry args={[0.11, 0.08, 4]} />
        <meshStandardMaterial color={palette.iron} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <torusGeometry args={[0.04, 0.008, 4, 10]} />
        <meshStandardMaterial color={palette.iron} />
      </mesh>
    </group>
  );
}

/** Where each station's keeper stands and what she holds. Home has the commander instead. */
const KEEPERS: ReadonlyArray<{
  readonly station: KeeperStation;
  readonly at: Vec3;
  readonly held: ReactNode;
}> = [
  { station: "intake", at: besideStation("intake", 1.6), held: <Basket /> },
  { station: "work", at: besideStation("work", 1.4), held: <Hammer /> },
  { station: "gate", at: besideStation("gate", 1.4), held: <Lantern /> },
];

/** One keeper at each station other than home, told apart by her tail and what she holds. They do not move. */
export function KeeperFigures() {
  return (
    <group>
      {KEEPERS.map((keeper) => (
        <Keeper
          key={keeper.station}
          position={keeper.at}
          tail={palette.tails[keeper.station]}
          held={keeper.held}
        />
      ))}
    </group>
  );
}
