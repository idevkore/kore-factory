import { type PerspectiveCamera, Vector3 } from "three";

const VIEW_DIRECTION = new Vector3(14, 16, 22).normalize();
const VIEW_TARGET = new Vector3(1.2, 0, 2);
const MARGIN_PX = 24;
const RIM = 10.25;
/** The ground's corners, rim included, and the tops of the tallest station shapes. */
const FIT_POINTS = [
  ...[0, -1.1].flatMap((y) =>
    [-RIM, RIM].flatMap((x) => [-RIM, RIM].map((z) => new Vector3(x, y, z))),
  ),
  new Vector3(6, 4.4, -6),
  new Vector3(-4.84, 4.55, -7.6),
  new Vector3(-7.6, 4.55, -4.84),
];
const scratch = new Vector3();

function fits(camera: PerspectiveCamera, visibleWidth: number, height: number, width: number) {
  return FIT_POINTS.every((point) => {
    const projected = scratch.copy(point).project(camera);
    const x = ((projected.x + 1) / 2) * width;
    const y = ((1 - projected.y) / 2) * height;
    return (
      x >= MARGIN_PX && x <= visibleWidth - MARGIN_PX && y >= MARGIN_PX && y <= height - MARGIN_PX
    );
  });
}

/**
 * Points `camera` along the fixed three-quarter view and backs it off until
 * the whole island fits the canvas left of `coveredRight` pixels. A view
 * offset centres the island in that uncovered part.
 */
export function fitIslandCamera(
  camera: PerspectiveCamera,
  width: number,
  height: number,
  coveredRight: number,
): void {
  const covered = Math.min(coveredRight, width / 2);
  camera.aspect = (width + covered) / height;
  camera.setViewOffset(width + covered, height, covered, 0, width, height);
  camera.updateProjectionMatrix();
  for (let distance = 15; distance < 400; distance *= 1.04) {
    camera.position.copy(VIEW_DIRECTION).multiplyScalar(distance).add(VIEW_TARGET);
    camera.lookAt(VIEW_TARGET);
    camera.updateMatrixWorld();
    if (fits(camera, width - covered, height, width)) return;
  }
}
