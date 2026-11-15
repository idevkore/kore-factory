import type { StationId } from "../core/contract";

/** The theme's words the panel and the hidden list show. The scene's `Theme` provides them. */
export interface IslandWording {
  readonly worldName: string;
  readonly nouns: { readonly figure: string; readonly carrier: string };
  readonly stationLabels: Readonly<Record<StationId, string>>;
}

export function capitalized(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
