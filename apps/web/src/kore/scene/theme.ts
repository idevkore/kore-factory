import type { SessionState, StationId } from "../core/contract";

/** A station that has a keeper; home has the commander instead. */
export type KeeperStation = Exclude<StationId, "home">;

/**
 * The island's look apart from geometry. A new look replaces `currentTheme`
 * and this folder's role components; `core/`, `feed/` and `hud/` stay put.
 */
export interface Theme {
  /** The world's name in the panel header. */
  readonly worldName: string;
  /** Lower-case nouns the panel and the hidden list use for the figure and the carrier. */
  readonly nouns: { readonly figure: string; readonly carrier: string };
  /** What each station is called in the panel and the hidden list, after "at the". */
  readonly stationLabels: Readonly<Record<StationId, string>>;
  readonly palette: {
    readonly background: string;
    /** The band round the ground's edge. */
    readonly rim: string;
    /** The focus ring and gilded details. */
    readonly accent: string;
    /** A session figure's body colour in each state. */
    readonly figure: Readonly<Record<SessionState, string>>;
    /** The band across a failed session's figure. */
    readonly failedBand: string;
    /** The crossed post beside a session whose approval was denied. */
    readonly deniedPost: string;
    /** The "this session needs you" sign. */
    readonly marker: string;
    readonly sea: string;
    readonly reef: string;
    readonly sand: string;
    readonly lagoon: string;
    readonly shallows: string;
    readonly rock: string;
    /** The temple and the lighthouse. */
    readonly stone: string;
    readonly stoneBand: string;
    readonly skin: string;
    readonly hair: string;
    readonly beard: string;
    readonly robe: string;
    readonly bronze: string;
    /** The band each keeper wears round her chest. */
    readonly wrap: string;
    /** Each keeper's tail, which is what tells them apart. */
    readonly tails: Readonly<Record<KeeperStation, string>>;
    readonly kelp: string;
    readonly coral: string;
    readonly wood: string;
    readonly iron: string;
    readonly lamp: string;
    readonly clam: string;
    readonly eye: string;
    readonly life: {
      readonly turtleShell: string;
      readonly turtleSkin: string;
      readonly octopus: string;
      readonly seal: string;
      readonly fish: string;
      readonly jelly: string;
      readonly starfish: string;
    };
  };
  readonly durations: {
    /** From the commander's hand to the new session's slot. */
    readonly carrierFlightMs: number;
    /** A figure walking to its new slot when its station changes. */
    readonly moveMs: number;
    /** The camera moving to a new preset or a new station. */
    readonly cameraMs: number;
  };
}

const GOLD = "#D4AF37";
const SLATE = "#7D8A9C";

export const currentTheme: Theme = {
  worldName: "KORE Atoll",
  nouns: { figure: "seahorse", carrier: "clam" },
  stationLabels: {
    home: "temple steps",
    intake: "kelp shallows",
    work: "coral forge",
    gate: "lighthouse",
  },
  palette: {
    background: "#071621",
    rim: "#0A2633",
    accent: GOLD,
    figure: {
      starting: "#8C7728",
      working: GOLD,
      needs_approval: GOLD,
      needs_answer: GOLD,
      idle: SLATE,
      done: "#10B981",
      stopped: SLATE,
      failed: "#1F2329",
    },
    failedBand: "#EF4444",
    deniedPost: "#7A3B2E",
    marker: "#EF4444",
    sea: "#0F4C68",
    reef: "#B98A78",
    sand: "#E6DCC3",
    lagoon: "#1F6F95",
    shallows: "#3E93AE",
    rock: "#5C5853",
    stone: "#D3D6DA",
    stoneBand: "#2E4A7D",
    skin: "#C89B7B",
    hair: "#E2C27A",
    beard: "#C3C6C9",
    robe: "#2F8A6E",
    bronze: "#B08D57",
    wrap: "#EEE7D7",
    tails: { intake: "#4F9C9A", work: "#A8653F", gate: "#3F5FA6" },
    kelp: "#5B6E32",
    coral: "#E0927C",
    wood: "#9A7B4F",
    iron: "#4A5058",
    lamp: "#FFE3A3",
    clam: "#E6C2A8",
    eye: "#111318",
    life: {
      turtleShell: "#6E7B45",
      turtleSkin: "#A3A77E",
      octopus: "#C4673F",
      seal: "#7D776F",
      fish: "#A9C6D6",
      jelly: "#EBCFE0",
      starfish: "#E07B39",
    },
  },
  durations: { carrierFlightMs: 1200, moveMs: 800, cameraMs: 600 },
};
