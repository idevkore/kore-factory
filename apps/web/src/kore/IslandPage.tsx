import { useEffect, useEffectEvent, useState } from "react";

import { SidebarInset } from "../components/ui/sidebar";
import { useNowMinute } from "../hooks/useNowMinute";
import type { IslandSnapshot } from "./core/contract";
import { diffSnapshots } from "./core/diff";
import { nextWaiting } from "./core/navigation";
import { useT3IslandFeed } from "./feed/useT3IslandFeed";
import { IslandHud } from "./hud/IslandHud";
import { IslandMirror } from "./hud/IslandMirror";
import { useIslandKeys } from "./hud/useIslandKeys";
import { IslandScene } from "./scene/IslandScene";
import { currentTheme } from "./scene/theme";

/** The panel is `w-96`; the camera centres the island in the canvas left of it. */
const PANEL_WIDTH_PX = 384;

function snapshotSignature(snapshot: IslandSnapshot): string {
  return `${snapshot.ready}|${snapshot.sessions.map((session) => `${session.key}=${session.state}`).join(",")}`;
}

/** Carriers in flight, by session key: one for each session that appears after the first load. */
function useCarrierFlights(snapshot: IslandSnapshot) {
  const [seen, setSeen] = useState<IslandSnapshot | null>(null);
  const [flights, setFlights] = useState<ReadonlySet<string>>(() => new Set());
  if (seen === null || snapshotSignature(seen) !== snapshotSignature(snapshot)) {
    setSeen(snapshot);
    const events = diffSnapshots(seen, snapshot);
    const added = events.flatMap((event) => (event.type === "session_added" ? [event.key] : []));
    const removed = events.flatMap((event) =>
      event.type === "session_removed" ? [event.key] : [],
    );
    if (added.length > 0 || removed.length > 0) {
      setFlights((current) => {
        const next = new Set(current);
        for (const key of added) next.add(key);
        for (const key of removed) next.delete(key);
        return next;
      });
    }
  }
  const land = (key: string) =>
    setFlights((current) => {
      const next = new Set(current);
      next.delete(key);
      return next;
    });
  return { flights, land };
}

/** Lands one carrier when its flight time is up. */
function CarrierLanding(props: {
  readonly sessionKey: string;
  readonly onLand: (key: string) => void;
}) {
  const land = useEffectEvent(() => props.onLand(props.sessionKey));
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Landing runs on a timer, not on drawn frames, so the island's state stays right where no frames run (a hidden tab).
  useEffect(() => {
    const timer = setTimeout(land, currentTheme.durations.carrierFlightMs);
    return () => clearTimeout(timer);
  }, []);
  return null;
}

export function IslandPage() {
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const feed = useT3IslandFeed(focusKey);
  const nowMs = Date.parse(`${useNowMinute()}Z`);
  const { snapshot } = feed;
  const { flights, land } = useCarrierFlights(snapshot);
  const focused = snapshot.sessions.find((session) => session.key === focusKey) ?? null;

  useIslandKeys({
    onNext: () => {
      const next = nextWaiting(snapshot.sessions, focusKey);
      if (next !== null) setFocusKey(next);
    },
    onClear: () => setFocusKey(null),
  });

  return (
    <SidebarInset className="h-dvh">
      <div
        className="relative size-full overflow-hidden"
        style={{ background: currentTheme.palette.background }}
        data-testid="kore-island"
      >
        <IslandScene
          sessions={snapshot.sessions}
          flights={flights}
          focusKey={focused?.key ?? null}
          coveredRight={PANEL_WIDTH_PX}
          onFocus={setFocusKey}
        />
        <IslandHud
          snapshot={snapshot}
          wording={currentTheme}
          nowMs={nowMs}
          focused={focused}
          pending={feed.pending}
          pendingLoading={feed.pendingLoading}
          onFocus={setFocusKey}
          onResolve={feed.resolve}
          onOpenInConsole={feed.openInConsole}
        />
        <IslandMirror sessions={snapshot.sessions} flights={flights} wording={currentTheme} />
        {[...flights].map((key) => (
          <CarrierLanding key={key} sessionKey={key} onLand={land} />
        ))}
      </div>
    </SidebarInset>
  );
}
