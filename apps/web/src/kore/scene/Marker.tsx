import { currentTheme } from "./theme";

/** The buoy beside a session figure that means "this session needs you", and nothing else. */
export function Marker() {
  const { marker } = currentTheme.palette;
  const paint = <meshStandardMaterial color={marker} emissive={marker} emissiveIntensity={0.35} />;
  return (
    <group position={[0.5, 0, 0]}>
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.2, 0.24, 0.4, 16]} />
        {paint}
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <coneGeometry args={[0.18, 0.7, 16]} />
        {paint}
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.9, 6]} />
        {paint}
      </mesh>
      <mesh position={[0, 2.05, 0]}>
        <sphereGeometry args={[0.15, 12, 10]} />
        {paint}
      </mesh>
    </group>
  );
}
