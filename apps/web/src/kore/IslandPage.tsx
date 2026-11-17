import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useEffectEvent, useState } from "react";

import { SidebarInset } from "../components/ui/sidebar";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useNowMinute } from "../hooks/useNowMinute";
import type { CameraPreset, IslandFeed, IslandSession, IslandWorld } from "./core/contract";
import { diffSnapshots } from "./core/diff";
import { nextWaitingAcrossWorlds } from "./core/worlds";
import { useSimulatedIslandFeed } from "./feed/useSimulatedIslandFeed";
import { useT3IslandFeed } from "./feed/useT3IslandFeed";
import {
  COVERED_BOTTOM_PX,
  COVERED_TOP_PX,
  PANEL_WIDTH_PX,
  RAIL_COVERED_LEFT_PX,
} from "./hud/insets";
import { IslandHud } from "./hud/IslandHud";
import { IslandMirror } from "./hud/IslandMirror";
import { useIslandKeys } from "./hud/useIslandKeys";
import { IslandScene } from "./scene/IslandScene";
import { currentTheme } from "./scene/theme";

interface WorldView {
  readonly worldId: string | null;
  readonly ready: boolean;
  readonly sessions: ReadonlyArray<IslandSession>;
}

function viewSignature(view: WorldView): string {
  return `${view.worldId}|${view.ready}|${view.sessions.map((session) => `${session.key}=${session.state}`).join(",")}`;
}

/**
 * Carriers in flight, by session key: one for each session that appears in the
 * shown world after it first loads. Switching world shows its sessions in place.
 */
function useCarrierFlights(view: WorldView) {
  const [seen, setSeen] = useState<WorldView | null>(null);
  const [flights, setFlights] = useState<ReadonlySet<string>>(() => new Set());
  if (seen === null || viewSignature(seen) !== viewSignature(view)) {
    setSeen(view);
    const switched = seen !== null && seen.worldId !== view.worldId;
    const events = switched ? [] : diffSnapshots(seen, view);
    const added = events.flatMap((event) => (event.type === "session_added" ? [event.key] : []));
    const removed = events.flatMap((event) =>
      event.type === "session_removed" ? [event.key] : [],
    );
    if (switched) {
      setFlights(new Set());
    } else if (added.length > 0 || removed.length > 0) {
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

/** The world in the URL when it is listed; else the first with a waiting session; else the first. */
function resolveActiveWorld(
  worlds: ReadonlyArray<IslandWorld>,
  requested: string | undefined,
): IslandWorld | null {
  return (
    worlds.find((world) => world.id === requested) ??
    worlds.find((world) => world.waiting > 0) ??
    worlds[0] ??
    null
  );
}

interface IslandViewProps {
  readonly feed: IslandFeed;
  readonly focusKey: string | null;
  readonly setFocusKey: (key: string | null) => void;
  readonly simulated: boolean;
}

function LiveIsland() {
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const feed = useT3IslandFeed(focusKey, currentTheme.worldName);
  return <IslandView feed={feed} focusKey={focusKey} setFocusKey={setFocusKey} simulated={false} />;
}

function SimulatedIsland() {
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const feed = useSimulatedIslandFeed(focusKey, currentTheme.worldName);
  return <IslandView feed={feed} focusKey={focusKey} setFocusKey={setFocusKey} simulated />;
}

/** `?feed=sim` shows made-up sessions in place of real ones. */
export function IslandPage() {
  const search = useSearch({ from: "/_chat/island" });
  return search.feed === "sim" ? <SimulatedIsland /> : <LiveIsland />;
}

function IslandView({ feed, focusKey, setFocusKey, simulated }: IslandViewProps) {
  const search = useSearch({ from: "/_chat/island" });
  const navigate = useNavigate({ from: "/island" });
  const [camera, setCamera] = useState<CameraPreset>("overview");
  const nowMs = Date.parse(`${useNowMinute()}Z`);
  const { worlds, ready } = feed.snapshot;
  const activeWorld = resolveActiveWorld(worlds, search.world);
  const sessions = activeWorld?.sessions ?? [];
  const { flights, land } = useCarrierFlights({
    worldId: activeWorld?.id ?? null,
    ready,
    sessions,
  });
  const focused = sessions.find((session) => session.key === focusKey) ?? null;
  const railShown = useMediaQuery("lg") && worlds.length > 1;

  const unpinnedWorld =
    ready && activeWorld !== null && search.world !== activeWorld.id ? activeWorld.id : null;
  const pinWorld = useEffectEvent((worldId: string) => {
    void navigate({ search: (previous) => ({ ...previous, world: worldId }), replace: true });
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Writes the default world into the URL once the worlds load, so a session starting or waiting elsewhere cannot move it.
  useEffect(() => {
    if (unpinnedWorld !== null) pinWorld(unpinnedWorld);
  }, [unpinnedWorld]);

  // Writes the world even when it is the default, so the default moving cannot switch it.
  const selectWorld = (worldId: string) => {
    if (
      focusKey !== null &&
      !worlds.some(
        (world) =>
          world.id === worldId && world.sessions.some((session) => session.key === focusKey),
      )
    ) {
      setFocusKey(null);
    }
    if (search.world === worldId) return;
    void navigate({ search: (previous) => ({ ...previous, world: worldId }), replace: true });
  };
  const focusSession = (key: string) => {
    const world = worlds.find((entry) => entry.sessions.some((session) => session.key === key));
    if (world !== undefined) selectWorld(world.id);
    setFocusKey(key);
  };
  const stepWorld = (step: 1 | -1) => {
    if (activeWorld === null || worlds.length < 2) return;
    const index = worlds.findIndex((world) => world.id === activeWorld.id);
    selectWorld(worlds[(index + step + worlds.length) % worlds.length]!.id);
  };

  useIslandKeys({
    onNext: () => {
      const next = nextWaitingAcrossWorlds(worlds, focusKey);
      if (next !== null) focusSession(next.key);
    },
    onClear: () => setFocusKey(null),
    onPrevWorld: () => stepWorld(-1),
    onNextWorld: () => stepWorld(1),
    onCamera: setCamera,
  });

  return (
    <SidebarInset className="h-dvh">
      <div
        className="relative size-full overflow-hidden"
        style={{ background: currentTheme.palette.background }}
        data-testid="kore-island"
      >
        <IslandScene
          sessions={sessions}
          flights={flights}
          focusKey={focused?.key ?? null}
          coveredRight={PANEL_WIDTH_PX}
          coveredLeft={railShown ? RAIL_COVERED_LEFT_PX : 0}
          coveredTop={COVERED_TOP_PX}
          coveredBottom={COVERED_BOTTOM_PX}
          camera={camera}
          onFocus={focusSession}
        />
        <IslandHud
          worlds={worlds}
          activeWorldId={activeWorld?.id ?? null}
          ready={ready}
          worldsError={feed.worldsError}
          wording={currentTheme}
          nowMs={nowMs}
          focused={focused}
          pending={feed.pending}
          pendingLoading={feed.pendingLoading}
          camera={camera}
          onFocus={focusSession}
          onSelectWorld={selectWorld}
          onCamera={setCamera}
          onResolve={feed.resolve}
          onOpenInConsole={feed.openInConsole}
          simulated={simulated}
        />
        <IslandMirror sessions={sessions} flights={flights} wording={currentTheme} />
        {[...flights].map((key) => (
          <CarrierLanding key={key} sessionKey={key} onLand={land} />
        ))}
      </div>
    </SidebarInset>
  );
}
