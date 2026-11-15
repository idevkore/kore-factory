import { facingCentre, type Vec3 } from "../core/layout";
import { currentTheme } from "./theme";

/** A standing figure, built from simple shapes, that faces the centre of the ground. */
export function StandingFigure(props: {
  readonly position: Vec3;
  readonly body: string;
  readonly accent: string;
  readonly scale?: number;
}) {
  const { shade } = currentTheme.palette;
  return (
    <group
      position={props.position}
      rotation-y={facingCentre(props.position)}
      scale={props.scale ?? 1}
    >
      <mesh position={[-0.13, 0.22, 0]}>
        <boxGeometry args={[0.16, 0.44, 0.18]} />
        <meshStandardMaterial color={shade} />
      </mesh>
      <mesh position={[0.13, 0.22, 0]}>
        <boxGeometry args={[0.16, 0.44, 0.18]} />
        <meshStandardMaterial color={shade} />
      </mesh>
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.24, 0.3, 0.6, 12]} />
        <meshStandardMaterial color={props.body} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <boxGeometry args={[0.7, 0.14, 0.24]} />
        <meshStandardMaterial color={props.accent} />
      </mesh>
      <mesh position={[0, 1.24, 0]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        <meshStandardMaterial color={props.body} />
      </mesh>
      <mesh position={[0, 1.44, 0]}>
        <boxGeometry args={[0.32, 0.08, 0.32]} />
        <meshStandardMaterial color={props.accent} />
      </mesh>
    </group>
  );
}
