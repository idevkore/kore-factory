import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type { PerspectiveCamera } from "three";

import type { CameraPreset, StationId } from "../core/contract";
import { applyPose, blendPose, type CameraPose, fitCamera } from "./camera";
import { currentTheme } from "./theme";

interface Covered {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

interface Goal {
  readonly preset: CameraPreset;
  readonly station: StationId;
  readonly covered: Covered;
}

interface Shown {
  readonly sizeKey: string;
  readonly goalKey: string;
  readonly from: CameraPose;
  readonly to: CameraPose;
  readonly startedAt: number;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** False, so motion is allowed, where the window has no `matchMedia`. */
function prefersReducedMotion(element: HTMLElement): boolean {
  return (
    element.ownerDocument.defaultView?.matchMedia?.("(prefers-reduced-motion: reduce)").matches ??
    false
  );
}

/**
 * Drives the camera on frames the on-demand loop draws. A resize refits at
 * once; a new preset, or a new station for the station preset, eases there
 * over `cameraMs` and asks for frames only while it moves.
 */
export function IslandCamera(props: {
  readonly preset: CameraPreset;
  readonly station: StationId;
  readonly covered: Covered;
}) {
  const { preset, station } = props;
  const { left, right, top, bottom } = props.covered;
  const goal = useRef<Goal>({ preset, station, covered: { left, right, top, bottom } });
  const shown = useRef<Shown | null>(null);
  const invalidate = useThree((state) => state.invalidate);

  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Hands a new goal to the frame loop, which draws only when asked, so the camera gets frames to move.
  useEffect(() => {
    goal.current = { preset, station, covered: { left, right, top, bottom } };
    invalidate();
  }, [invalidate, preset, station, left, right, top, bottom]);

  useFrame((state) => {
    const { width, height } = state.size;
    if (width === 0 || height === 0) return;
    const { preset, station, covered } = goal.current;
    const goalKey = preset === "station" ? `station:${station}` : preset;
    const camera = state.camera as PerspectiveCamera;
    const now = state.clock.elapsedTime;
    const sizeKey = `${width}x${height}:${covered.left},${covered.right},${covered.top},${covered.bottom}`;
    const viewport = {
      width,
      height,
      coveredLeft: covered.left,
      coveredRight: covered.right,
      coveredTop: covered.top,
      coveredBottom: covered.bottom,
    };
    const last = shown.current;
    if (last === null || last.sizeKey !== sizeKey) {
      const pose = fitCamera(camera, viewport, preset, station);
      shown.current = { sizeKey, goalKey, from: pose, to: pose, startedAt: now };
      return;
    }
    let active = last;
    if (last.goalKey !== goalKey) {
      const elapsed = ((now - last.startedAt) * 1000) / currentTheme.durations.cameraMs;
      const from = blendPose(last.from, last.to, easeInOut(Math.min(1, elapsed)));
      const to = fitCamera(camera, viewport, preset, station);
      const startedAt = prefersReducedMotion(state.gl.domElement)
        ? now - currentTheme.durations.cameraMs / 1000
        : now;
      active = { sizeKey, goalKey, from, to, startedAt };
      shown.current = active;
    }
    const t = Math.min(1, ((now - active.startedAt) * 1000) / currentTheme.durations.cameraMs);
    if (t < 1) {
      applyPose(camera, blendPose(active.from, active.to, easeInOut(t)));
      state.invalidate();
    } else {
      applyPose(camera, active.to);
    }
  });
  return null;
}
