import { AuthOrchestrationReadScope, EnvironmentHttpApi } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder";

import {
  annotateEnvironmentRequest,
  failEnvironmentInternal,
  requireEnvironmentScope,
} from "../auth/http.ts";
import { traceLocalHandlerWork } from "../cloud/traceRelayRequest.ts";
import * as KoreWorlds from "./KoreWorlds.ts";

export const layer = HttpApiBuilder.group(
  EnvironmentHttpApi,
  "kore",
  Effect.fnUntraced(function* (handlers) {
    const worlds = yield* KoreWorlds.KoreWorlds;

    return handlers.handle(
      "worlds",
      Effect.fn("environment.kore.worlds")(function* (args) {
        yield* annotateEnvironmentRequest(args.endpoint.name);
        yield* requireEnvironmentScope(AuthOrchestrationReadScope);
        return yield* worlds.read.pipe(
          traceLocalHandlerWork,
          Effect.map((rules) => ({ worlds: rules })),
          Effect.catch((cause) => failEnvironmentInternal("kore_worlds_load_failed", cause)),
        );
      }),
    );
  }),
);
