import { currentTheme } from "./theme";

/** What a new session arrives as, thrown from the commander to its slot. */
export function Carrier() {
  const { stationTrim, accent } = currentTheme.palette;
  return (
    <group position={[0, 0.3, 0]}>
      <mesh>
        <cylinderGeometry args={[0.3, 0.3, 0.56, 16]} />
        <meshStandardMaterial color={stationTrim} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.315, 0.315, 0.06, 16]} />
        <meshStandardMaterial color={accent} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.17, 0]}>
        <cylinderGeometry args={[0.315, 0.315, 0.06, 16]} />
        <meshStandardMaterial color={accent} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}
