import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vite-plus/test";

import { sampleWorld } from "./sampleWorld";
import { TelemetryBar } from "./TelemetryBar";
import { WorldRail } from "./WorldRail";

const nowMs = Date.parse("2026-01-02T11:05:00.000Z");

const worlds = [
  sampleWorld("Reef", { visible: 3, working: 1, waiting: 0, oldest: null }),
  sampleWorld("Lagoon", { visible: 4, working: 2, waiting: 2, oldest: "2026-01-02T09:00:00.000Z" }),
];

function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

describe("TelemetryBar", () => {
  it("names the active world and counts every world", () => {
    const html = renderToStaticMarkup(
      <TelemetryBar worlds={worlds} worldName="Reef" nowMs={nowMs} />,
    );
    expect(text(html)).toBe("Reef Working 3 Needs you 2 Sessions 7 Longest wait 2h 5m");
  });

  it("reads none for the longest wait when nothing waits", () => {
    const html = renderToStaticMarkup(
      <TelemetryBar worlds={worlds.slice(0, 1)} worldName="Reef" nowMs={nowMs} />,
    );
    expect(text(html)).toContain("Longest wait none");
  });
});

describe("WorldRail", () => {
  it("marks the active world and shows a wait only where something waits", () => {
    const html = renderToStaticMarkup(
      <WorldRail worlds={worlds} activeWorldId="Lagoon" nowMs={nowMs} onSelectWorld={() => {}} />,
    );
    const buttons = html.split("<button").slice(1);
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).not.toContain("aria-current");
    expect(text(`<${buttons[0]}`)).toBe("Reef Working 1 0 waiting");
    expect(buttons[1]).toContain('aria-current="true"');
    expect(text(`<${buttons[1]}`)).toBe("Lagoon Working 2 2 waiting oldest 2h 5m");
  });

  it("uses the error badge only for a world with something waiting", () => {
    const html = renderToStaticMarkup(
      <WorldRail worlds={worlds} activeWorldId="Reef" nowMs={nowMs} onSelectWorld={() => {}} />,
    );
    const [reef, lagoon] = html.split("<button").slice(1);
    expect(reef).not.toContain("text-destructive-foreground");
    expect(lagoon).toContain("text-destructive-foreground");
  });
});
