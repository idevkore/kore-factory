import { type KoreWorldRule, KoreWorldsFile } from "@t3tools/contracts";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Layer from "effect/Layer";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import * as ServerConfig from "../config.ts";

const decodeWorldsFile = Schema.decodeUnknownEffect(Schema.fromJsonString(KoreWorldsFile));

/** Carries no file contents: a parse or decode message can quote them. */
export class KoreWorldsError extends Schema.TaggedError<KoreWorldsError>()("KoreWorldsError", {
  operation: Schema.Literals(["read", "decode"]),
  detail: Schema.String,
}) {
  override get message(): string {
    return `Failed to ${this.operation} the island worlds file (${this.detail}).`;
  }
}

export class KoreWorlds extends Context.Service<
  KoreWorlds,
  {
    /** The rules in `<baseDir>/kore/worlds.json`; none when the file is missing. */
    readonly read: Effect.Effect<ReadonlyArray<KoreWorldRule>, KoreWorldsError>;
  }
>()("t3/kore/KoreWorlds") {}

export const layer = Layer.effect(
  KoreWorlds,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const { baseDir } = yield* ServerConfig.ServerConfig;
    const filePath = path.join(baseDir, "kore", "worlds.json");

    const read = Effect.fn("KoreWorlds.read")(function* () {
      const raw = yield* fs.readFileString(filePath).pipe(
        Effect.map((contents): string | null => contents),
        Effect.catchTags({
          PlatformError: (cause) =>
            cause.reason._tag === "NotFound"
              ? Effect.succeed(null)
              : Effect.fail(new KoreWorldsError({ operation: "read", detail: cause.reason._tag })),
        }),
      );
      if (raw === null) return [];
      const file = yield* decodeWorldsFile(raw).pipe(
        Effect.mapError(
          () => new KoreWorldsError({ operation: "decode", detail: "not a version 1 worlds file" }),
        ),
      );
      return file.worlds;
    });

    return KoreWorlds.of({ read: read() });
  }),
);
