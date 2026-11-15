import type { SessionState } from "../core/contract";
import { currentTheme } from "./theme";

/** The figure that stands for one session; its colour follows the session's state. */
export function SessionFigure(props: { readonly state: SessionState }) {
  const { palette } = currentTheme;
  const color = palette.figure[props.state];
  return (
    <group>
      <mesh position={[-0.12, 0.13, 0]}>
        <boxGeometry args={[0.14, 0.26, 0.14]} />
        <meshStandardMaterial color={palette.shade} />
      </mesh>
      <mesh position={[0.12, 0.13, 0]}>
        <boxGeometry args={[0.14, 0.26, 0.14]} />
        <meshStandardMaterial color={palette.shade} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.36]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      {props.state === "failed" ? (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.52, 0.1, 0.38]} />
          <meshStandardMaterial color={palette.failedBand} />
        </mesh>
      ) : null}
      <mesh position={[0, 0.92, 0]}>
        <boxGeometry args={[0.36, 0.28, 0.32]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.94, 0.165]}>
        <boxGeometry args={[0.28, 0.08, 0.02]} />
        <meshStandardMaterial color={palette.visor} />
      </mesh>
      <mesh position={[0, 1.14, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.16, 6]} />
        <meshStandardMaterial color={palette.shade} />
      </mesh>
    </group>
  );
}
