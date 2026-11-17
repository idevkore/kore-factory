import type { SessionState } from "../core/contract";
import { currentTheme } from "./theme";

/** How far a stopped figure leans back, tail on the ground, head away from its snout. */
const RESTING_LEAN = 0.45;

/**
 * The figure that stands for one session: an upright seahorse, snout to +x so
 * the overview camera sees it side on. Its body colour follows the session's
 * state; a failed one wears a red chest band, and a stopped one rests leaning
 * back with an iron band round its waist, so stopped and idle differ in shape.
 */
export function SessionFigure(props: { readonly state: SessionState }) {
  const { palette } = currentTheme;
  const body = (
    <meshStandardMaterial color={palette.figure[props.state]} metalness={0.3} roughness={0.5} />
  );
  const stopped = props.state === "stopped";
  return (
    <group rotation-z={stopped ? RESTING_LEAN : 0}>
      {/* Turned so the curl's gap is at the top, where the tail meets it. */}
      <mesh position={[0.02, 0.15, 0]} rotation-z={Math.PI * 0.7}>
        <torusGeometry args={[0.11, 0.04, 8, 20, Math.PI * 1.6]} />
        {body}
      </mesh>
      <mesh position={[-0.03, 0.4, 0]} rotation-z={-0.2}>
        <cylinderGeometry args={[0.12, 0.05, 0.36, 10]} />
        {body}
      </mesh>
      <mesh position={[0.03, 0.72, 0]} scale={[0.85, 1.2, 0.75]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        {body}
      </mesh>
      {props.state === "failed" ? (
        <mesh position={[0.03, 0.72, 0]}>
          <cylinderGeometry args={[0.185, 0.185, 0.08, 16]} />
          <meshStandardMaterial color={palette.failedBand} />
        </mesh>
      ) : null}
      {stopped ? (
        <mesh position={[-0.01, 0.52, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.08, 16]} />
          <meshStandardMaterial color={palette.iron} metalness={0.6} roughness={0.4} />
        </mesh>
      ) : null}
      <mesh position={[-0.17, 0.74, 0]} rotation-z={0.2}>
        <boxGeometry args={[0.1, 0.22, 0.02]} />
        {body}
      </mesh>
      <mesh position={[-0.02, 0.98, 0]} rotation-z={0.35}>
        <cylinderGeometry args={[0.1, 0.13, 0.2, 10]} />
        {body}
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.13, 16, 12]} />
        {body}
      </mesh>
      <mesh position={[0.18, 1.07, 0]} rotation-z={-Math.PI / 2}>
        <cylinderGeometry args={[0.035, 0.05, 0.2, 8]} />
        {body}
      </mesh>
      <mesh position={[-0.02, 1.25, 0]}>
        <coneGeometry args={[0.05, 0.1, 6]} />
        {body}
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[0.05, 1.13, side * 0.11]}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshStandardMaterial color={palette.eye} />
        </mesh>
      ))}
    </group>
  );
}
