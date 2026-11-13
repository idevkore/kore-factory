import { createFileRoute } from "@tanstack/react-router";

import { IslandPage } from "../kore/IslandPage";

export const Route = createFileRoute("/_chat/island")({
  component: IslandPage,
});
