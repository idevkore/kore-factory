import type { IslandSession, StationId } from "./contract";

export type Vec3 = readonly [number, number, number];

export const GROUND_SIZE = 20;
const GROUND_EDGE = GROUND_SIZE / 2 - 0.6;

export const STATION_POSITIONS: Record<StationId, Vec3> = {
  home: [-5, 0, -5],
  work: [5, 0, 0],
  intake: [2, 0, 6],
  gate: [6, 0, -6],
};

/** Where carriers leave from: the commander's hand above the home station. */
export const COMMANDER_HAND: Vec3 = [-5, 2.3, -5];

/** Distance from a station's centre to its first ring of slots, clear of its shape. */
const FIRST_RING: Record<StationId, number> = {
  home: 3,
  work: 2.2,
  intake: 2.4,
  gate: 2.2,
};
const RING_GAP = 1.2;
const SLOT_SPACING = 1.15;

function ringCapacity(radius: number): number {
  return Math.floor((2 * Math.PI * radius) / SLOT_SPACING);
}

/** The unit vector in the ground plane from `station` away from the ground's centre. */
function outwardFrom(station: StationId): readonly [number, number] {
  const [x, , z] = STATION_POSITIONS[station];
  const length = Math.hypot(x, z);
  return [x / length, z / length];
}

/** A ground point `distance` out from `station`, away from the centre, at `height`. */
export function besideStation(station: StationId, distance: number, height = 0): Vec3 {
  const [x, , z] = STATION_POSITIONS[station];
  const [outX, outZ] = outwardFrom(station);
  return [x + outX * distance, height, z + outZ * distance];
}

/** The turn about the vertical axis that faces something standing at `from` towards the centre. */
export function facingCentre(from: Vec3): number {
  return Math.atan2(-from[0], -from[2]);
}

function clampToGround(value: number): number {
  return Math.min(GROUND_EDGE, Math.max(-GROUND_EDGE, value));
}

/**
 * The ground spot for the `index`th of `count` figures at `station`. Figures
 * fill rings around the station, each ring's group centred on the side that
 * faces the ground's centre.
 */
export function slotPosition(station: StationId, index: number, count: number): Vec3 {
  const total = Math.max(count, index + 1);
  let radius = FIRST_RING[station];
  let ringStart = 0;
  let capacity = ringCapacity(radius);
  while (index >= ringStart + capacity) {
    ringStart += capacity;
    radius += RING_GAP;
    capacity = ringCapacity(radius);
  }
  const inRing = Math.min(total - ringStart, capacity);
  const [outX, outZ] = outwardFrom(station);
  const towardCentre = Math.atan2(-outZ, -outX);
  const angle = towardCentre + (index - ringStart - (inRing - 1) / 2) * ((2 * Math.PI) / capacity);
  const [x, , z] = STATION_POSITIONS[station];
  return [
    clampToGround(x + radius * Math.cos(angle)),
    0,
    clampToGround(z + radius * Math.sin(angle)),
  ];
}

/** Each session's slot, numbered per station in order of creation. */
export function layoutSessions(sessions: ReadonlyArray<IslandSession>): Map<string, Vec3> {
  const byStation = new Map<StationId, IslandSession[]>();
  for (const session of sessions) {
    const group = byStation.get(session.station) ?? [];
    group.push(session);
    byStation.set(session.station, group);
  }
  const positions = new Map<string, Vec3>();
  for (const [station, group] of byStation) {
    const ordered = group.toSorted(
      (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.key.localeCompare(b.key),
    );
    for (const [index, session] of ordered.entries()) {
      positions.set(session.key, slotPosition(station, index, ordered.length));
    }
  }
  return positions;
}

/** A point on the carrier's arc: a quadratic Bézier from `from` to `to`, raised in the middle. */
export function carrierPoint(from: Vec3, to: Vec3, t: number): Vec3 {
  const rise = 3 + Math.hypot(to[0] - from[0], to[2] - from[2]) * 0.25;
  const control: Vec3 = [
    (from[0] + to[0]) / 2,
    Math.max(from[1], to[1]) + rise,
    (from[2] + to[2]) / 2,
  ];
  const u = 1 - t;
  const point = (axis: 0 | 1 | 2) =>
    u * u * from[axis] + 2 * u * t * control[axis] + t * t * to[axis];
  return [point(0), point(1), point(2)];
}
