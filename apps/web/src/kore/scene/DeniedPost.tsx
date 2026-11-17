import { currentTheme } from "./theme";

/** Two crossed planks beside a session figure whose approval the user denied. */
export function DeniedPost() {
  const paint = <meshStandardMaterial color={currentTheme.palette.deniedPost} roughness={0.9} />;
  return (
    <group position={[-0.45, 0, 0.2]}>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0, 0.36, 0]} rotation-z={side * 0.6}>
          <boxGeometry args={[0.09, 0.72, 0.04]} />
          {paint}
        </mesh>
      ))}
    </group>
  );
}
