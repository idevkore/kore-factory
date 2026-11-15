import { GROUND_SIZE } from "../core/layout";
import { currentTheme } from "./theme";

/** The square ground every station stands on, with a band round its edge. */
export function Ground() {
  const { ground, rim } = currentTheme.palette;
  return (
    <group>
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[GROUND_SIZE, 1, GROUND_SIZE]} />
        <meshStandardMaterial color={ground} roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.6, 0]}>
        <boxGeometry args={[GROUND_SIZE + 0.5, 1, GROUND_SIZE + 0.5]} />
        <meshStandardMaterial color={rim} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}
