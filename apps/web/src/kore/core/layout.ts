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

/** How many figures stand at each station before the rest go on its stack. */
export const STANDING_CAP: Record<StationId, number> = {
  home: 12,
  work: 8,
  intake: 6,
  gate: 6,
};

/**
 * Where each station's stack sits: just outside its slot ring, turned this far
 * from the side that faces the centre, onto a side the overview camera sees
 * and clear of the keepers and the sea life.
 */
const STACK_TURN: Record<StationId, number> = {
  home: Math.PI / 2,
  work: -Math.PI / 2,
  intake: -Math.PI / 4,
  gate: -Math.PI / 2,
};

/** The ground spot of `station`'s stack. */
export function stackPosition(station: StationId): Vec3 {
  const [outX, outZ] = outwardFrom(station);
  const angle = Math.atan2(-outZ, -outX) + STACK_TURN[station];
  const radius = FIRST_RING[station] + RING_GAP;
  const [x, , z] = STATION_POSITIONS[station];
  return [x + radius * Math.cos(angle), 0, z + radius * Math.sin(angle)];
}

/** The sessions past a station's cap, drawn as one pile of discs beside it. */
export interface SessionStack {
  readonly station: StationId;
  readonly position: Vec3;
  /** In station order; the first is the one a click on the stack focuses. */
  readonly keys: ReadonlyArray<string>;
}

interface SessionLayout {
  /** The slot of every session that stands. */
  readonly standing: ReadonlyMap<string, Vec3>;
  /** One per station that has more sessions than its cap. */
  readonly stacks: ReadonlyArray<SessionStack>;
}

const NEVER = Number.POSITIVE_INFINITY;

function byCreation(a: IslandSession, b: IslandSession): number {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.key.localeCompare(b.key);
}

/** Longest waiting first; a session with no wait time goes after those with one. */
function byWaiting(a: IslandSession, b: IslandSession): number {
  const waitedA = a.waitingSince === null ? NEVER : Date.parse(a.waitingSince);
  const waitedB = b.waitingSince === null ? NEVER : Date.parse(b.waitingSince);
  return (waitedA === waitedB ? 0 : waitedA < waitedB ? -1 : 1) || byCreation(a, b);
}

/**
 * Each station's sessions in order (at the gate, longest waiting first; at the
 * others, oldest first). The first `STANDING_CAP` stand in slots and the rest
 * go on the station's stack. The focused session always stands: past the cap,
 * it takes the last slot and that slot's session goes to the front of the stack.
 */
export function layoutSessions(
  sessions: ReadonlyArray<IslandSession>,
  focusKey: string | null,
): SessionLayout {
  const byStation = new Map<StationId, IslandSession[]>();
  for (const session of sessions) {
    const group = byStation.get(session.station) ?? [];
    group.push(session);
    byStation.set(session.station, group);
  }
  const standing = new Map<string, Vec3>();
  const stacks: SessionStack[] = [];
  for (const [station, group] of byStation) {
    const ordered = group.toSorted(station === "gate" ? byWaiting : byCreation);
    const cap = STANDING_CAP[station];
    const keys = ordered.map((session) => session.key);
    const focusIndex = focusKey === null ? -1 : keys.indexOf(focusKey);
    if (focusKey !== null && focusIndex >= cap) {
      keys.splice(focusIndex, 1);
      keys.splice(cap - 1, 0, focusKey);
    }
    const standingKeys = keys.slice(0, cap);
    for (const [index, key] of standingKeys.entries()) {
      standing.set(key, slotPosition(station, index, standingKeys.length));
    }
    if (keys.length > cap) {
      stacks.push({ station, position: stackPosition(station), keys: keys.slice(cap) });
    }
  }
  return { standing, stacks };
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
