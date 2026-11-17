import { EnvironmentRegistry } from "@t3tools/client-runtime/connection";
import { executeConnectedEnvironmentHttpRequest } from "@t3tools/client-runtime/state/environmentHttpAuth";
import { createRuntimeCommand } from "@t3tools/client-runtime/state/runtime";
import type { EnvironmentId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import { connectionAtomRuntime } from "../../connection/runtime";

const WORLDS_REQUEST_TIMEOUT_MS = 15_000;

/** The island's world rules, from `<baseDir>/kore/worlds.json` on that environment. */
export const readKoreWorlds = createRuntimeCommand(connectionAtomRuntime, {
  label: "web:kore:read-worlds",
  execute: (input: { readonly environmentId: EnvironmentId }) =>
    Effect.flatMap(EnvironmentRegistry.EnvironmentRegistry, (registry) =>
      registry.run(
        input.environmentId,
        executeConnectedEnvironmentHttpRequest({
          group: "kore",
          method: "GET",
          timeoutMs: WORLDS_REQUEST_TIMEOUT_MS,
          url: (urls) => urls.worlds(),
          request: ({ client, headers }) => client.worlds({ headers }),
        }),
      ),
    ),
});
