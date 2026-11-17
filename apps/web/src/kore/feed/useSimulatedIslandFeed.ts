import { useEffect, useState } from "react";

import type { IslandFeed, Resolution } from "../core/contract";
import {
  createSimulation,
  resolveSimulation,
  type Simulation,
  simulationPending,
  simulationSnapshot,
  stepSimulation,
} from "../core/simulator";

const SEED = 7;
/** Long enough to see the island's loading state. */
const LOADING_MS = 600;
const STEP_MS = 2_000;

/** Made-up sessions for trying the island: no network, no model, nothing about real sessions. */
export function useSimulatedIslandFeed(
  focusKey: string | null,
  defaultWorldName: string,
): IslandFeed {
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- Runs the simulation on wall-clock timers, which live outside React.
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    const start = setTimeout(() => {
      setSimulation(createSimulation(SEED, Date.now()));
      interval = setInterval(
        () => setSimulation((current) => current && stepSimulation(current, Date.now())),
        STEP_MS,
      );
    }, LOADING_MS);
    return () => {
      clearTimeout(start);
      clearInterval(interval);
    };
  }, []);

  const resolve = async (sessionKey: string, requestId: string, resolution: Resolution) => {
    if (simulation === null) throw new Error("This request is no longer open.");
    // Stepping is deterministic, so resolving from this render's value matches the latest one.
    setSimulation(resolveSimulation(simulation, sessionKey, requestId, resolution, Date.now()));
  };

  return {
    snapshot:
      simulation === null
        ? { ready: false, worlds: [] }
        : simulationSnapshot(simulation, simulation.nowMs, defaultWorldName),
    pending:
      simulation === null || focusKey === null ? null : simulationPending(simulation, focusKey),
    pendingLoading: false,
    worldsError: null,
    resolve,
    openInConsole: () => {},
  };
}
