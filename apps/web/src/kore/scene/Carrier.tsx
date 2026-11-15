import { useFrame } from "@react-three/fiber";
import { type RefObject, useRef } from "react";
import { DoubleSide, type Group } from "three";

import { currentTheme } from "./theme";

const OPEN_FROM = 0.7;
const OPEN_ANGLE = 1.9;

/**
 * What a new session arrives as: a clam sent from the commander to its slot.
 * `progress` is the flight's share done, 0 to 1; the lid opens near the end.
 * It only reads frames the flight already asks for.
 */
export function Carrier(props: { readonly progress: RefObject<number> }) {
  const { clam } = currentTheme.palette;
  const lid = useRef<Group>(null);
  useFrame(() => {
    if (lid.current === null) return;
    const opened = Math.max(0, (props.progress.current - OPEN_FROM) / (1 - OPEN_FROM));
    lid.current.rotation.x = -OPEN_ANGLE * opened;
  });
  const shell = <meshStandardMaterial color={clam} roughness={0.6} side={DoubleSide} />;
  return (
    <group position={[0, 0.15, 0]}>
      <mesh scale={[1, 0.45, 0.85]}>
        <sphereGeometry args={[0.3, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        {shell}
      </mesh>
      <group ref={lid} position={[0, 0, -0.25]}>
        <mesh position={[0, 0, 0.25]} scale={[1, 0.45, 0.85]}>
          <sphereGeometry args={[0.3, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          {shell}
        </mesh>
      </group>
    </group>
  );
}
