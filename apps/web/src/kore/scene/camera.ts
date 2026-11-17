import { type PerspectiveCamera, Vector3 } from "three";

import type { CameraPreset, StationId } from "../core/contract";
import { STATION_POSITIONS } from "../core/layout";

const VIEW_DIRECTION = new Vector3(14, 16, 22).normalize();
const VIEW_TARGET = new Vector3(1.2, 0, 2);
const UPRIGHT = new Vector3(0, 1, 0);
/** Straight down, the scene's -z up the screen. */
const TOP_DIRECTION = new Vector3(0, 1, 0);
const TOP_UP = new Vector3(0, 0, -1);
const ISLAND_CENTRE = new Vector3(0, 0, 0);
const MARGIN_PX = 24;
const RIM = 10.25;
/** The ground's corners, rim included, and the tops of the tallest station shapes. */
const ISLAND_POINTS = [
  ...[0, -1.1].flatMap((y) =>
    [-RIM, RIM].flatMap((x) => [-RIM, RIM].map((z) => new Vector3(x, y, z))),
  ),
  new Vector3(6, 4.4, -6),
  new Vector3(-4.84, 4.55, -7.6),
  new Vector3(-7.6, 4.55, -4.84),
];
const STATION_RADIUS = 5;
const STATION_HEIGHT = 4.6;
const STATION_RING_POINTS = 24;
const scratch = new Vector3();

/** The canvas size in pixels and how much of each edge the panel's cards cover. */
export interface Viewport {
  readonly width: number;
  readonly height: number;
  readonly coveredLeft: number;
  readonly coveredRight: number;
  readonly coveredTop: number;
  readonly coveredBottom: number;
}

/** Where the camera stands, what it looks at and which way is up on screen. */
export interface CameraPose {
  readonly position: Vector3;
  readonly target: Vector3;
  readonly up: Vector3;
}

/** Two covered edges, scaled down together so they leave at least half of `size`. */
function clampPair(start: number, end: number, size: number): readonly [number, number] {
  const first = Math.max(0, start);
  const second = Math.max(0, end);
  const total = first + second;
  if (total <= size / 2) return [first, second];
  const scale = size / 2 / total;
  return [first * scale, second * scale];
}

/** The part of the canvas the island is fitted into, in canvas pixels, margin included. */
export function fitArea(viewport: Viewport) {
  const [left, right] = clampPair(viewport.coveredLeft, viewport.coveredRight, viewport.width);
  const [top, bottom] = clampPair(viewport.coveredTop, viewport.coveredBottom, viewport.height);
  return {
    covered: { left, right, top, bottom },
    left: left + MARGIN_PX,
    right: viewport.width - right - MARGIN_PX,
    top: top + MARGIN_PX,
    bottom: viewport.height - bottom - MARGIN_PX,
  };
}

/**
 * Sets the projection so the camera's line of sight lands on the centre of the
 * fit area: the canvas is a window into a larger virtual one centred there.
 */
function setProjection(camera: PerspectiveCamera, viewport: Viewport) {
  const { covered } = fitArea(viewport);
  const extraWidth = Math.abs(covered.right - covered.left);
  const extraHeight = Math.abs(covered.bottom - covered.top);
  const fullWidth = viewport.width + extraWidth;
  const fullHeight = viewport.height + extraHeight;
  camera.aspect = fullWidth / fullHeight;
  camera.setViewOffset(
    fullWidth,
    fullHeight,
    Math.max(0, covered.right - covered.left),
    Math.max(0, covered.bottom - covered.top),
    viewport.width,
    viewport.height,
  );
  camera.updateProjectionMatrix();
}

/** Where `point` lands on the canvas, in pixels, or null when it is behind the camera. */
export function projectToCanvas(
  camera: PerspectiveCamera,
  viewport: Viewport,
  point: Vector3,
): readonly [number, number] | null {
  const projected = scratch.copy(point).project(camera);
  if (projected.z < -1 || projected.z > 1) return null;
  return [((projected.x + 1) / 2) * viewport.width, ((1 - projected.y) / 2) * viewport.height];
}

function fits(camera: PerspectiveCamera, viewport: Viewport, points: ReadonlyArray<Vector3>) {
  const area = fitArea(viewport);
  return points.every((point) => {
    const spot = projectToCanvas(camera, viewport, point);
    if (spot === null) return false;
    const [x, y] = spot;
    return x >= area.left && x <= area.right && y >= area.top && y <= area.bottom;
  });
}

/** The points a preset must keep inside the fit area. */
export function fitPoints(preset: CameraPreset, station: StationId): ReadonlyArray<Vector3> {
  if (preset !== "station") return ISLAND_POINTS;
  const [x, , z] = STATION_POSITIONS[station];
  return Array.from({ length: STATION_RING_POINTS }, (_, index) => {
    const angle = (index / STATION_RING_POINTS) * Math.PI * 2;
    return [0, STATION_HEIGHT].map(
      (y) =>
        new Vector3(x + STATION_RADIUS * Math.cos(angle), y, z + STATION_RADIUS * Math.sin(angle)),
    );
  }).flat();
}

export function applyPose(camera: PerspectiveCamera, pose: CameraPose): void {
  camera.position.copy(pose.position);
  camera.up.copy(pose.up);
  camera.lookAt(pose.target);
  camera.updateMatrixWorld();
}

/**
 * Sets the projection for `viewport`, then points `camera` the preset's way and
 * backs it off until its fit points sit inside the fit area. `station` is the
 * station the station preset frames. Leaves the camera at the pose it returns.
 */
export function fitCamera(
  camera: PerspectiveCamera,
  viewport: Viewport,
  preset: CameraPreset,
  station: StationId,
): CameraPose {
  setProjection(camera, viewport);
  const [x, , z] = STATION_POSITIONS[station];
  const target =
    preset === "overview"
      ? VIEW_TARGET.clone()
      : preset === "top"
        ? ISLAND_CENTRE.clone()
        : new Vector3(x, 0, z);
  const direction = preset === "top" ? TOP_DIRECTION : VIEW_DIRECTION;
  const up = (preset === "top" ? TOP_UP : UPRIGHT).clone();
  const points = fitPoints(preset, station);
  // The overview starts where it always has, so its distance steps are unchanged.
  let distance = preset === "overview" ? 15 : 4;
  let pose: CameraPose = { position: new Vector3(), target, up };
  for (; distance < 400; distance *= 1.04) {
    pose = { position: direction.clone().multiplyScalar(distance).add(target), target, up };
    applyPose(camera, pose);
    if (fits(camera, viewport, points)) return pose;
  }
  return pose;
}

/** The pose `t` of the way from `from` to `to`, with `t` already eased. */
export function blendPose(from: CameraPose, to: CameraPose, t: number): CameraPose {
  const up = from.up.clone().lerp(to.up, t);
  return {
    position: from.position.clone().lerp(to.position, t),
    target: from.target.clone().lerp(to.target, t),
    up: up.lengthSq() === 0 ? to.up.clone() : up.normalize(),
  };
}
