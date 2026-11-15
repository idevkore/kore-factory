import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { DoubleSide, type Group } from "three";

import type { IslandSession, SessionState } from "../core/contract";
import {
  BARREL_FLIGHT_MS,
  carrierPoint,
  COMMANDER_HAND,
  STATION_MOVE_MS,
  type Vec3,
} from "../core/layout";
import { needsYou } from "../core/state";
import { COLORS, robotColor } from "./palette";

interface Motion {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly startedAt: number;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function RobotBody(props: { readonly state: SessionState }) {
  const color = robotColor(props.state);
  return (
    <group>
      <mesh position={[-0.12, 0.13, 0]}>
        <boxGeometry args={[0.14, 0.26, 0.14]} />
        <meshStandardMaterial color={COLORS.iron} />
      </mesh>
      <mesh position={[0.12, 0.13, 0]}>
        <boxGeometry args={[0.14, 0.26, 0.14]} />
        <meshStandardMaterial color={COLORS.iron} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.36]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      {props.state === "failed" ? (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.52, 0.1, 0.38]} />
          <meshStandardMaterial color={COLORS.red} />
        </mesh>
      ) : null}
      <mesh position={[0, 0.92, 0]}>
        <boxGeometry args={[0.36, 0.28, 0.32]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.94, 0.165]}>
        <boxGeometry args={[0.28, 0.08, 0.02]} />
        <meshStandardMaterial color={COLORS.visor} />
      </mesh>
      <mesh position={[0, 1.14, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.16, 6]} />
        <meshStandardMaterial color={COLORS.iron} />
      </mesh>
    </group>
  );
}

function Barrel() {
  return (
    <group position={[0, 0.3, 0]}>
      <mesh>
        <cylinderGeometry args={[0.3, 0.3, 0.56, 16]} />
        <meshStandardMaterial color={COLORS.wood} />
      </mesh>
      <mesh position={[0, 0.17, 0]}>
        <cylinderGeometry args={[0.315, 0.315, 0.06, 16]} />
        <meshStandardMaterial color={COLORS.gold} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[0, -0.17, 0]}>
        <cylinderGeometry args={[0.315, 0.315, 0.06, 16]} />
        <meshStandardMaterial color={COLORS.gold} metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

function Totem() {
  return (
    <group position={[0.5, 0, 0]}>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.18, 2.4, 0.18]} />
        <meshStandardMaterial color={COLORS.red} emissive={COLORS.red} emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[0.32, 0.32, 0.32]} />
        <meshStandardMaterial color={COLORS.red} emissive={COLORS.red} emissiveIntensity={0.35} />
      </mesh>
    </group>
  );
}

function FocusRing() {
  return (
    <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.48, 0.62, 40]} />
      <meshBasicMaterial color={COLORS.gold} side={DoubleSide} />
    </mesh>
  );
}

export function Robot(props: {
  readonly session: IslandSession;
  readonly target: Vec3;
  readonly inFlight: boolean;
  readonly focused: boolean;
  readonly onFocus: (key: string) => void;
}) {
  const { session, inFlight, onFocus } = props;
  const [tx, ty, tz] = props.target;
  const group = useRef<Group>(null);
  const motion = useRef<Motion | null>(null);
  const flightStartedAt = useRef<number | null>(null);
  const slot = useRef<Vec3 | null>(null);
  const invalidate = useThree((state) => state.invalidate);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Hands a new slot to the frame loop, which draws only when asked, so the move gets frames.
  useEffect(() => {
    slot.current = [tx, ty, tz];
    invalidate();
  }, [invalidate, tx, ty, tz]);

  useFrame((state) => {
    const node = group.current;
    if (node === null) return;
    const now = state.clock.elapsedTime;
    const target = slot.current ?? props.target;
    if (inFlight) {
      const startedAt = flightStartedAt.current ?? now;
      flightStartedAt.current = startedAt;
      const t = Math.min(1, ((now - startedAt) * 1000) / BARREL_FLIGHT_MS);
      node.position.set(...carrierPoint(COMMANDER_HAND, target, t));
      if (t < 1) state.invalidate();
      return;
    }
    const current = motion.current;
    if (current === null) {
      node.position.set(...target);
      motion.current = { from: target, to: target, startedAt: now - STATION_MOVE_MS / 1000 };
      return;
    }
    let active = current;
    if (current.to.some((value, axis) => value !== target[axis])) {
      const { x, y, z } = node.position;
      active = { from: [x, y, z], to: target, startedAt: now };
      motion.current = active;
    }
    const { from, to, startedAt } = active;
    const t = Math.min(1, ((now - startedAt) * 1000) / STATION_MOVE_MS);
    const eased = easeInOut(t);
    node.position.set(
      from[0] + (to[0] - from[0]) * eased,
      from[1] + (to[1] - from[1]) * eased,
      from[2] + (to[2] - from[2]) * eased,
    );
    if (t < 1) state.invalidate();
  });

  const focus = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onFocus(session.key);
  };

  return (
    <group ref={group} onClick={focus}>
      {inFlight ? <Barrel /> : <RobotBody state={session.state} />}
      {!inFlight && needsYou(session.state) ? <Totem /> : null}
      {!inFlight && props.focused ? <FocusRing /> : null}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.9, 1.4, 0.9]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
