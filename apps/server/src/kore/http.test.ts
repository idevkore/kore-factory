import * as NodeServices from "@effect/platform-node/NodeServices";
import { expect, it } from "@effect/vitest";
import {
  AuthOrchestrationReadScope,
  AuthSessionId,
  EnvironmentAuthenticatedAuth,
  EnvironmentAuthenticatedPrincipal,
  EnvironmentKoreHttpApi,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Etag from "effect/http/Etag";
import * as HttpPlatform from "effect/http/HttpPlatform";
import * as HttpRouter from "effect/http/HttpRouter";
import * as HttpApi from "effect/http-api/HttpApi";
import * as HttpApiBuilder from "effect/http-api/HttpApiBuilder";

import * as ServerConfig from "../config.ts";
import * as KoreHttp from "./http.ts";
import * as KoreWorlds from "./KoreWorlds.ts";

const principal = Layer.succeed(EnvironmentAuthenticatedAuth, (effect) =>
  effect.pipe(
    Effect.provideService(EnvironmentAuthenticatedPrincipal, {
      sessionId: AuthSessionId.make("kore-test"),
      subject: "test",
      method: "bearer-access-token",
      scopes: new Set([AuthOrchestrationReadScope]),
    }),
  ),
);

/** Serves the route over a fresh base directory, writing `worlds.json` first when given. */
const getWorlds = (worldsJson: string | null | { readonly directory: true }) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const baseDir = yield* fs.makeTempDirectoryScoped({ prefix: "kore-worlds-test-" });
    const worldsPath = path.join(baseDir, "kore", "worlds.json");
    if (typeof worldsJson === "string") {
      yield* fs.makeDirectory(path.join(baseDir, "kore"), { recursive: true });
      yield* fs.writeFileString(worldsPath, worldsJson);
    } else if (worldsJson !== null) {
      yield* fs.makeDirectory(worldsPath, { recursive: true });
    }
    const routes = HttpApiBuilder.layer(
      HttpApi.make("environment").add(EnvironmentKoreHttpApi),
    ).pipe(
      Layer.provide(KoreHttp.layer),
      Layer.provide(KoreWorlds.layer),
      Layer.provide(principal),
      Layer.provide(ServerConfig.layerTest(process.cwd(), baseDir)),
      Layer.provide(HttpPlatform.layer),
      Layer.provide(Etag.layerWeak),
      Layer.provide(NodeServices.layer),
    );
    const { handler, dispose } = HttpRouter.toWebHandler(routes, { disableLogger: true });
    yield* Effect.addFinalizer(() => Effect.promise(dispose));
    const response = yield* Effect.promise(() =>
      handler(new Request("http://localhost/api/kore/worlds")),
    );
    return { status: response.status, body: yield* Effect.promise(() => response.text()) };
  }).pipe(Effect.provide(NodeServices.layer));

it.effect("answers no worlds when the file is missing", () =>
  Effect.gen(function* () {
    const { status, body } = yield* getWorlds(null);
    expect(status).toBe(200);
    expect(JSON.parse(body)).toEqual({ worlds: [] });
  }),
);

it.effect("answers the file's worlds, with empty lists for the ones left out", () =>
  Effect.gen(function* () {
    const { status, body } = yield* getWorlds(
      JSON.stringify({
        version: 1,
        worlds: [
          { id: "web", name: "Web", projects: ["*site*"] },
          { id: "acme", name: "Acme", paths: ["/home/dev/acme"] },
        ],
      }),
    );
    expect(status).toBe(200);
    expect(JSON.parse(body)).toEqual({
      worlds: [
        { id: "web", name: "Web", projects: ["*site*"], paths: [] },
        { id: "acme", name: "Acme", projects: [], paths: ["/home/dev/acme"] },
      ],
    });
  }),
);

it.effect("fails as an internal error without echoing a file it cannot decode", () =>
  Effect.gen(function* () {
    const { status, body } = yield* getWorlds('{"version": 2, "worlds": ["private-marker"]}');
    expect(status).toBe(500);
    expect(JSON.parse(body)).toMatchObject({
      _tag: "EnvironmentInternalError",
      reason: "kore_worlds_load_failed",
    });
    expect(body).not.toContain("private-marker");

    const broken = yield* getWorlds("{ not json private-marker");
    expect(broken.status).toBe(500);
    expect(broken.body).not.toContain("private-marker");
  }),
);

it.effect("fails as an internal error when worlds.json cannot be read as a file", () =>
  Effect.gen(function* () {
    const { status, body } = yield* getWorlds({ directory: true });
    expect(status).toBe(500);
    expect(JSON.parse(body)).toMatchObject({
      _tag: "EnvironmentInternalError",
      reason: "kore_worlds_load_failed",
    });
  }),
);
