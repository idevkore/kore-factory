import { currentTheme } from "./theme";

/** The sign beside a session figure that means "this session needs you", and nothing else. */
export function Marker() {
  const { marker } = currentTheme.palette;
  return (
    <group position={[0.5, 0, 0]}>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.18, 2.4, 0.18]} />
        <meshStandardMaterial color={marker} emissive={marker} emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial color={marker} emissive={marker} emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}
