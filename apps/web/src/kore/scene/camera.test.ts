import { PerspectiveCamera, Vector3 } from "three";
import { describe, expect, it } from "vite-plus/test";

import type { CameraPreset, StationId } from "../core/contract";
import { STATION_POSITIONS } from "../core/layout";
import { blendPose, fitArea, fitCamera, fitPoints, projectToCanvas, type Viewport } from "./camera";

function newCamera() {
  return new PerspectiveCamera(40, 1, 1, 400);
}

function viewport(width: number, height: number, covered: Partial<Viewport> = {}): Viewport {
  return {
    width,
    height,
    coveredLeft: 0,
    coveredRight: 0,
    coveredTop: 0,
    coveredBottom: 0,
    ...covered,
  };
}

/** The overview fit as it was before the covered edges and presets, kept to compare against. */
function previousFit(
  camera: PerspectiveCamera,
  width: number,
  height: number,
  coveredRight: number,
) {
  const direction = new Vector3(14, 16, 22).normalize();
  const target = new Vector3(1.2, 0, 2);
  const rim = 10.25;
  const points = [
    ...[0, -1.1].flatMap((y) =>
      [-rim, rim].flatMap((x) => [-rim, rim].map((z) => new Vector3(x, y, z))),
    ),
    new Vector3(6, 4.4, -6),
    new Vector3(-4.84, 4.55, -7.6),
    new Vector3(-7.6, 4.55, -4.84),
  ];
  const covered = Math.min(coveredRight, width / 2);
  camera.aspect = (width + covered) / height;
  camera.setViewOffset(width + covered, height, covered, 0, width, height);
  camera.updateProjectionMatrix();
  const fits = () =>
    points.every((point) => {
      const projected = point.clone().project(camera);
      const x = ((projected.x + 1) / 2) * width;
      const y = ((1 - projected.y) / 2) * height;
      return x >= 24 && x <= width - covered - 24 && y >= 24 && y <= height - 24;
    });
  for (let distance = 15; distance < 400; distance *= 1.04) {
    camera.position.copy(direction).multiplyScalar(distance).add(target);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    if (fits()) return;
  }
}

const SIZES: ReadonlyArray<readonly [number, number, number]> = [
  [1440, 900, 384],
  [1024, 768, 384],
  [600, 900, 384],
  [500, 400, 384],
  [1920, 1080, 0],
];

const COVERED: ReadonlyArray<Partial<Viewport>> = [
  { coveredRight: 384, coveredLeft: 200, coveredTop: 64, coveredBottom: 60 },
  { coveredRight: 384, coveredTop: 64 },
  { coveredLeft: 900, coveredRight: 900, coveredTop: 800, coveredBottom: 10 },
];

const STATIONS: ReadonlyArray<StationId> = ["home", "intake", "work", "gate"];

function expectInsideFitArea(
  camera: PerspectiveCamera,
  view: Viewport,
  preset: CameraPreset,
  station: StationId,
) {
  const area = fitArea(view);
  for (const point of fitPoints(preset, station)) {
    const spot = projectToCanvas(camera, view, point);
    expect(spot).not.toBeNull();
    const [x, y] = spot!;
    expect(x).toBeGreaterThanOrEqual(area.left);
    expect(x).toBeLessThanOrEqual(area.right);
    expect(y).toBeGreaterThanOrEqual(area.top);
    expect(y).toBeLessThanOrEqual(area.bottom);
  }
}

describe("fitCamera", () => {
  it.each(SIZES)(
    "gives the previous overview at %ix%i with %ipx covered on the right",
    (width, height, right) => {
      const before = newCamera();
      previousFit(before, width, height, right);
      const after = newCamera();
      fitCamera(after, viewport(width, height, { coveredRight: right }), "overview", "gate");
      expect(after.position.toArray()).toEqual(before.position.toArray());
      expect(after.quaternion.toArray()).toEqual(before.quaternion.toArray());
      expect(after.projectionMatrix.toArray()).toEqual(before.projectionMatrix.toArray());
    },
  );

  it.each(COVERED)("keeps the whole island inside the fit area with %o covered", (covered) => {
    for (const preset of ["overview", "top"] as const) {
      const camera = newCamera();
      const view = viewport(1440, 900, covered);
      fitCamera(camera, view, preset, "gate");
      expectInsideFitArea(camera, view, preset, "gate");
    }
  });

  it("looks straight down from the top, with -z up the screen", () => {
    const camera = newCamera();
    const view = viewport(1440, 900, { coveredRight: 384 });
    fitCamera(camera, view, "top", "gate");
    expect(camera.getWorldDirection(new Vector3()).angleTo(new Vector3(0, -1, 0))).toBeCloseTo(0);
    const [, north] = projectToCanvas(camera, view, new Vector3(0, 0, -5))!;
    const [, south] = projectToCanvas(camera, view, new Vector3(0, 0, 5))!;
    expect(north).toBeLessThan(south);
  });

  it.each(STATIONS)(
    "puts the %s at the centre of the fit area and frames its circle",
    (station) => {
      const camera = newCamera();
      const view = viewport(1440, 900, { coveredRight: 384, coveredLeft: 200, coveredTop: 64 });
      fitCamera(camera, view, "station", station);
      const area = fitArea(view);
      const [x, , z] = STATION_POSITIONS[station];
      const [cx, cy] = projectToCanvas(camera, view, new Vector3(x, 0, z))!;
      expect(cx).toBeCloseTo((area.left + area.right) / 2, 6);
      expect(cy).toBeCloseTo((area.top + area.bottom) / 2, 6);
      expectInsideFitArea(camera, view, "station", station);
    },
  );

  it("frames a station closer than the overview frames the island", () => {
    const view = viewport(1440, 900, { coveredRight: 384 });
    const overview = fitCamera(newCamera(), view, "overview", "gate");
    const station = fitCamera(newCamera(), view, "station", "gate");
    expect(station.position.distanceTo(station.target)).toBeLessThan(
      overview.position.distanceTo(overview.target),
    );
  });
});

describe("fitArea", () => {
  it("never leaves less than half the canvas in either direction", () => {
    const area = fitArea(viewport(1000, 600, COVERED[2]));
    expect(area.covered.left + area.covered.right).toBeCloseTo(500);
    expect(area.covered.top + area.covered.bottom).toBeCloseTo(300);
    expect(area.covered.left).toBeCloseTo(area.covered.right);
  });
});

describe("blendPose", () => {
  it("runs from one pose to the other", () => {
    const view = viewport(1440, 900, { coveredRight: 384 });
    const from = fitCamera(newCamera(), view, "overview", "gate");
    const to = fitCamera(newCamera(), view, "top", "gate");
    expect(blendPose(from, to, 0).position.toArray()).toEqual(from.position.toArray());
    const end = blendPose(from, to, 1);
    for (const [axis, value] of end.position.toArray().entries()) {
      expect(value).toBeCloseTo(to.position.getComponent(axis));
    }
    expect(blendPose(from, to, 0.5).up.length()).toBeCloseTo(1);
  });
});
