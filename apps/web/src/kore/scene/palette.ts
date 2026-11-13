import type { SessionState } from "../core/contract";

export const COLORS = {
  background: "#0A0B0E",
  gold: "#D4AF37",
  dimGold: "#8C7728",
  green: "#10B981",
  grey: "#6B7280",
  dark: "#1F2329",
  red: "#EF4444",
  stone: "#3A3E46",
  stoneLight: "#535863",
  iron: "#2B2F36",
  wood: "#7A4B26",
  steel: "#A3A9B4",
  visor: "#111318",
} as const;

export function robotColor(state: SessionState): string {
  switch (state) {
    case "working":
    case "needs_approval":
    case "needs_answer":
      return COLORS.gold;
    case "starting":
      return COLORS.dimGold;
    case "done":
      return COLORS.green;
    case "failed":
      return COLORS.dark;
    case "idle":
    case "stopped":
      return COLORS.grey;
  }
}
