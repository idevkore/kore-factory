import type { Vec3 } from "../core/layout";
import { currentTheme } from "./theme";

const { palette } = currentTheme;
const { life } = palette;

/*
 * Decoration only. Nothing reads these, the hidden list leaves them out, and
 * none of them moves: the scene must draw no frames while it is idle.
 */

function Turtle(props: { readonly at: Vec3; readonly turn: number }) {
  const skin = <meshStandardMaterial color={life.turtleSkin} />;
  return (
    <group position={props.at} rotation-y={props.turn}>
      <mesh position={[0, 0.17, 0]} scale={[1, 0.38, 1.2]}>
        <sphereGeometry args={[0.45, 18, 12]} />
        <meshStandardMaterial color={life.turtleShell} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.14, 0.62]}>
        <sphereGeometry args={[0.13, 12, 10]} />
        {skin}
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.42, 0.06, 0.25]} rotation-y={side * 0.5}>
            <boxGeometry args={[0.42, 0.05, 0.18]} />
            {skin}
          </mesh>
          <mesh position={[side * 0.3, 0.05, -0.42]} rotation-y={side * -0.4}>
            <boxGeometry args={[0.22, 0.05, 0.12]} />
            {skin}
          </mesh>
        </group>
      ))}
    </group>
  );
}

const ARMS = Array.from({ length: 8 }, (_, index) => (index * Math.PI) / 4);

function Octopus(props: { readonly at: Vec3 }) {
  const skin = <meshStandardMaterial color={life.octopus} roughness={0.7} />;
  return (
    <group position={props.at}>
      <mesh position={[0, 0.25, 0]} scale={[1.2, 0.7, 1]}>
        <dodecahedronGeometry args={[0.45]} />
        <meshStandardMaterial color={palette.rock} roughness={1} />
      </mesh>
      <mesh position={[0, 0.78, 0]} scale={[1, 1.25, 1]}>
        <sphereGeometry args={[0.26, 16, 12]} />
        {skin}
      </mesh>
      {ARMS.map((angle) => (
        <group key={angle} rotation-y={-angle}>
          <mesh position={[0.38, 0.42, 0]} rotation-z={1.1}>
            <cylinderGeometry args={[0.06, 0.025, 0.55, 6]} />
            {skin}
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0.2, 0.8, side * 0.1]}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshStandardMaterial color={palette.eye} />
        </mesh>
      ))}
    </group>
  );
}

function Seal(props: { readonly at: Vec3; readonly turn: number }) {
  const skin = <meshStandardMaterial color={life.seal} roughness={0.6} />;
  return (
    <group position={props.at} rotation-y={props.turn}>
      <mesh position={[0, 0.2, 0]} scale={[1.3, 0.7, 1]}>
        <dodecahedronGeometry args={[0.42]} />
        <meshStandardMaterial color={palette.rock} roughness={1} />
      </mesh>
      <mesh position={[0, 0.58, 0]} scale={[0.8, 0.7, 1.7]}>
        <sphereGeometry args={[0.28, 16, 12]} />
        {skin}
      </mesh>
      <mesh position={[0, 0.8, 0.44]}>
        <sphereGeometry args={[0.17, 14, 10]} />
        {skin}
      </mesh>
      <mesh position={[0, 0.76, 0.6]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        {skin}
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.24, 0.45, 0.2]} rotation-z={side * 0.6}>
          <boxGeometry args={[0.2, 0.04, 0.12]} />
          {skin}
        </mesh>
      ))}
      <mesh position={[0, 0.45, -0.5]}>
        <boxGeometry args={[0.3, 0.04, 0.14]} />
        {skin}
      </mesh>
    </group>
  );
}

const SCHOOL_CENTRE: Vec3 = [-0.9, 0, 0.9];
const SCHOOL: ReadonlyArray<Vec3> = [
  [0, 0.7, 0],
  [0.45, 0.82, 0.3],
  [-0.4, 0.6, 0.35],
  [0.3, 0.55, -0.4],
  [-0.5, 0.88, -0.25],
  [0.8, 0.66, -0.1],
  [-0.1, 0.95, 0.55],
];

function FishSchool() {
  const scales = <meshStandardMaterial color={life.fish} metalness={0.4} roughness={0.4} />;
  return (
    <group position={SCHOOL_CENTRE} rotation-y={0.4}>
      {SCHOOL.map((at) => (
        <group key={at.join(",")} position={at}>
          <mesh scale={[1.8, 0.8, 0.6]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            {scales}
          </mesh>
          <mesh position={[-0.22, 0, 0]} rotation-z={Math.PI / 2}>
            <coneGeometry args={[0.06, 0.12, 4]} />
            {scales}
          </mesh>
        </group>
      ))}
    </group>
  );
}

const JELLY_TENTACLES = [-0.12, -0.04, 0.04, 0.12];

function Jellyfish(props: { readonly at: Vec3 }) {
  const body = (
    <meshStandardMaterial color={life.jelly} transparent opacity={0.75} roughness={0.3} />
  );
  return (
    <group position={props.at}>
      <mesh position={[0, 0.55, 0]}>
        <sphereGeometry args={[0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        {body}
      </mesh>
      {JELLY_TENTACLES.map((offset) => (
        <mesh key={offset} position={[offset, 0.32, offset * 0.5]}>
          <cylinderGeometry args={[0.012, 0.008, 0.46, 4]} />
          {body}
        </mesh>
      ))}
    </group>
  );
}

const STAR_ARMS = Array.from({ length: 5 }, (_, index) => (index * 2 * Math.PI) / 5);

function Starfish(props: { readonly at: Vec3; readonly turn: number }) {
  return (
    <group position={props.at} rotation-y={props.turn}>
      {STAR_ARMS.map((angle) => (
        <group key={angle} rotation-y={angle}>
          <mesh position={[0.11, 0.025, 0]}>
            <boxGeometry args={[0.24, 0.04, 0.07]} />
            <meshStandardMaterial color={life.starfish} roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const STARFISH: ReadonlyArray<{ readonly at: Vec3; readonly turn: number }> = [
  { at: [-2, 0, 6.8], turn: 0.3 },
  { at: [7.6, 0, 3.2], turn: 1.1 },
  { at: [-7.2, 0, 1.5], turn: 2 },
  { at: [3.8, 0, -7.6], turn: 0.8 },
];

const JELLIES: ReadonlyArray<Vec3> = [
  [-8.6, 0, 8.4],
  [8.6, 0, 7.8],
  [7.6, 0, 9.2],
];

/** The sea life round the atoll: a turtle, an octopus, a seal, a school of fish, jellyfish and starfish. */
export function Scenery() {
  return (
    <group>
      <Turtle at={[4.6, 0, 7.6]} turn={0.6} />
      <Octopus at={[7.4, 0, 2]} />
      <Seal at={[6.92, 0, -5.08]} turn={1.3} />
      <FishSchool />
      {JELLIES.map((at) => (
        <Jellyfish key={at.join(",")} at={at} />
      ))}
      {STARFISH.map((star) => (
        <Starfish key={star.at.join(",")} at={star.at} turn={star.turn} />
      ))}
    </group>
  );
}
