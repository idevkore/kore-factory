import type { SessionState, StationId } from "../core/contract";

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
    /** The "this session needs you" sign. */
    readonly marker: string;
    readonly ground: string;
    readonly stationBase: string;
    readonly stationTrim: string;
    readonly metal: string;
    readonly shade: string;
    readonly visor: string;
    readonly commander: string;
    readonly keeper: string;
    readonly keeperAccent: string;
  };
  readonly durations: {
    /** From the commander's hand to the new session's slot. */
    readonly carrierFlightMs: number;
    /** A figure walking to its new slot when its station changes. */
    readonly moveMs: number;
  };
}

const GOLD = "#D4AF37";
const DIM_GOLD = "#8C7728";
const GREY = "#6B7280";

export const currentTheme: Theme = {
  worldName: "KORE HQ",
  nouns: { figure: "robot", carrier: "barrel" },
  stationLabels: {
    home: "command dais",
    intake: "crates",
    work: "anvil",
    gate: "watchtower",
  },
  palette: {
    background: "#0A0B0E",
    rim: GOLD,
    accent: GOLD,
    figure: {
      starting: DIM_GOLD,
      working: GOLD,
      needs_approval: GOLD,
      needs_answer: GOLD,
      idle: GREY,
      done: "#10B981",
      stopped: GREY,
      failed: "#1F2329",
    },
    failedBand: "#EF4444",
    marker: "#EF4444",
    ground: "#3A3E46",
    stationBase: "#535863",
    stationTrim: "#7A4B26",
    metal: "#A3A9B4",
    shade: "#2B2F36",
    visor: "#111318",
    commander: "#A3A9B4",
    keeper: GREY,
    keeperAccent: DIM_GOLD,
  },
  durations: { carrierFlightMs: 1200, moveMs: 800 },
};
