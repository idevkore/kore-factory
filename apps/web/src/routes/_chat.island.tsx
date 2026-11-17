import { createFileRoute } from "@tanstack/react-router";

import { IslandPage } from "../kore/IslandPage";

export const Route = createFileRoute("/_chat/island")({
  validateSearch: (raw: Record<string, unknown>) => ({
    ...(typeof raw.world === "string" && raw.world.trim() ? { world: raw.world } : {}),
    ...(raw.feed === "sim" ? { feed: "sim" as const } : {}),
  }),
  component: IslandPage,
});
