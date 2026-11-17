import type { ThreeEvent } from "@react-three/fiber";

import type { SessionState } from "../core/contract";
import type { SessionStack } from "../core/layout";
import { currentTheme } from "./theme";

const DISC_RADIUS = 0.3;
const DISC_HEIGHT = 0.07;
const DISC_STEP = 0.1;

/**
 * The sessions past a station's cap: one flat disc each, piled up so the
 * pile's height is the count, each in its session's state colour from the
 * bottom up. A click focuses the first, which then stands.
 */
export function StationStack(props: {
  readonly stack: SessionStack;
  readonly stateOf: (key: string) => SessionState;
  readonly onFocus: (key: string) => void;
}) {
  const { stack, stateOf, onFocus } = props;
  const { figure } = currentTheme.palette;
  const pileHeight = stack.keys.length * DISC_STEP;
  const focus = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const first = stack.keys[0];
    if (first !== undefined) onFocus(first);
  };
  return (
    <group position={stack.position} onClick={focus}>
      {stack.keys.map((key, index) => (
        <mesh key={key} position={[0, DISC_HEIGHT / 2 + index * DISC_STEP, 0]}>
          <cylinderGeometry args={[DISC_RADIUS, DISC_RADIUS, DISC_HEIGHT, 24]} />
          <meshStandardMaterial color={figure[stateOf(key)]} metalness={0.3} roughness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, pileHeight / 2, 0]}>
        <cylinderGeometry args={[DISC_RADIUS + 0.15, DISC_RADIUS + 0.15, pileHeight + 0.3, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
