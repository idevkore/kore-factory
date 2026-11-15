import { GROUND_SIZE } from "../core/layout";
import { currentTheme } from "./theme";

const SAND_RADIUS = 9.4;
const REEF_RADIUS = 9.9;
const LAGOON_RADIUS = 3.8;

/** Open sea on the square ground, with a ring of sand and reef round a lagoon in the middle. */
export function Ground() {
  const { sea, rim, reef, sand, lagoon } = currentTheme.palette;
  return (
    <group>
      <mesh position={[0, -0.56, 0]}>
        <boxGeometry args={[GROUND_SIZE, 1, GROUND_SIZE]} />
        <meshStandardMaterial color={sea} roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.66, 0]}>
        <boxGeometry args={[GROUND_SIZE + 0.5, 1, GROUND_SIZE + 0.5]} />
        <meshStandardMaterial color={rim} roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.13, 0]}>
        <cylinderGeometry args={[REEF_RADIUS, REEF_RADIUS, 0.2, 64]} />
        <meshStandardMaterial color={reef} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[SAND_RADIUS, SAND_RADIUS, 0.3, 64]} />
        <meshStandardMaterial color={sand} roughness={1} />
      </mesh>
      <mesh position={[0, -0.002, 0]}>
        <cylinderGeometry args={[LAGOON_RADIUS, LAGOON_RADIUS, 0.02, 64]} />
        <meshStandardMaterial color={lagoon} roughness={0.4} />
      </mesh>
    </group>
  );
}
