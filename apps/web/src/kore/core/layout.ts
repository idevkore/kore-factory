import type { IslandSession, StationId } from "./contract";

export type Vec3 = readonly [number, number, number];

export const ISLAND_SIZE = 20;
export const BARREL_FLIGHT_MS = 1200;
export const STATION_MOVE_MS = 800;
const ISLAND_EDGE = ISLAND_SIZE / 2 - 0.6;

export const STATION_POSITIONS: Record<StationId, Vec3> = {
  command: [-5, 0, -5],
  anvil: [5, 0, 0],
  crates: [2, 0, 6],
  watchtower: [6, 0, -6],
};

/** Where barrels leave from: the commander's hand on top of the dais. */
export const COMMANDER_HAND: Vec3 = [-5, 2.3, -5];

/** Distance from a station's centre to its first ring of slots, clear of its props. */
const FIRST_RING: Record<StationId, number> = {
  command: 3,
  anvil: 2.2,
  crates: 2.4,
  watchtower: 2.2,
};
const RING_GAP = 1.2;
const SLOT_SPACING = 1.15;

function ringCapacity(radius: number): number {
  return Math.floor((2 * Math.PI * radius) / SLOT_SPACING);
}

/** The unit vector in the ground plane from `station` away from the island's centre. */
export function outwardFrom(station: StationId): readonly [number, number] {
  const [x, , z] = STATION_POSITIONS[station];
  const length = Math.hypot(x, z);
  return [x / length, z / length];
}

function clampToIsland(value: number): number {
  return Math.min(ISLAND_EDGE, Math.max(-ISLAND_EDGE, value));
}

/**
 * The ground spot for the `index`th of `count` robots at `station`. Robots
 * fill rings around the station, each ring's group centred on the side that
 * faces the island's centre.
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
    clampToIsland(x + radius * Math.cos(angle)),
    0,
    clampToIsland(z + radius * Math.sin(angle)),
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

/** A point on the barrel's arc: a quadratic Bézier from `from` to `to`, raised in the middle. */
export function barrelPoint(from: Vec3, to: Vec3, t: number): Vec3 {
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
