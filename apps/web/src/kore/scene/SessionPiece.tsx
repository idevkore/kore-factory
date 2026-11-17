import { type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { DoubleSide, type Group } from "three";

import type { IslandSession } from "../core/contract";
import { carrierPoint, COMMANDER_HAND, type Vec3 } from "../core/layout";
import { needsYou } from "../core/state";
import { Carrier } from "./Carrier";
import { DeniedPost } from "./DeniedPost";
import { Marker } from "./Marker";
import { SessionFigure } from "./SessionFigure";
import { currentTheme } from "./theme";

interface Motion {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly startedAt: number;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function FocusRing() {
  return (
    <mesh position={[0, 0.02, 0]} rotation-x={-Math.PI / 2}>
      <ringGeometry args={[0.48, 0.62, 40]} />
      <meshBasicMaterial color={currentTheme.palette.accent} side={DoubleSide} />
    </mesh>
  );
}

/**
 * One standing session: its carrier while it flies in, then its figure, with
 * the marker while it needs the user, a crossed post while its last approval
 * stands denied, and a ring while it is focused.
 * Moves to its slot when the slot changes and asks for frames only while moving.
 */
export function SessionPiece(props: {
  readonly session: IslandSession;
  readonly target: Vec3;
  readonly inFlight: boolean;
  readonly focused: boolean;
  readonly onFocus: (key: string) => void;
}) {
  const { session, inFlight, onFocus } = props;
  const { carrierFlightMs, moveMs } = currentTheme.durations;
  const [tx, ty, tz] = props.target;
  const group = useRef<Group>(null);
  const motion = useRef<Motion | null>(null);
  const flightStartedAt = useRef<number | null>(null);
  const flightProgress = useRef(0);
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
      const t = Math.min(1, ((now - startedAt) * 1000) / carrierFlightMs);
      flightProgress.current = t;
      node.position.set(...carrierPoint(COMMANDER_HAND, target, t));
      if (t < 1) state.invalidate();
      return;
    }
    const current = motion.current;
    if (current === null) {
      node.position.set(...target);
      motion.current = { from: target, to: target, startedAt: now - moveMs / 1000 };
      return;
    }
    let active = current;
    if (current.to.some((value, axis) => value !== target[axis])) {
      const { x, y, z } = node.position;
      active = { from: [x, y, z], to: target, startedAt: now };
      motion.current = active;
    }
    const { from, to, startedAt } = active;
    const t = Math.min(1, ((now - startedAt) * 1000) / moveMs);
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
      {inFlight ? <Carrier progress={flightProgress} /> : <SessionFigure state={session.state} />}
      {!inFlight && needsYou(session.state) ? <Marker /> : null}
      {!inFlight && session.lastDecision === "denied" ? <DeniedPost /> : null}
      {!inFlight && props.focused ? <FocusRing /> : null}
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[0.9, 1.4, 0.9]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
