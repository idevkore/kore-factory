import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

import { TrimmedNonEmptyString } from "./baseSchemas.ts";

/** One world: projects whose title matches a pattern or whose workspace root is under a path. */
export const KoreWorldRule = Schema.Struct({
  id: TrimmedNonEmptyString,
  name: TrimmedNonEmptyString,
  projects: Schema.Array(Schema.String).pipe(Schema.withDecodingDefault(Effect.succeed([]))),
  paths: Schema.Array(Schema.String).pipe(Schema.withDecodingDefault(Effect.succeed([]))),
});
export type KoreWorldRule = typeof KoreWorldRule.Type;

/** `<baseDir>/kore/worlds.json`. */
export const KoreWorldsFile = Schema.Struct({
  version: Schema.Literal(1),
  worlds: Schema.Array(KoreWorldRule),
});
export type KoreWorldsFile = typeof KoreWorldsFile.Type;

export const KoreWorldsResponse = Schema.Struct({
  worlds: Schema.Array(KoreWorldRule),
});
export type KoreWorldsResponse = typeof KoreWorldsResponse.Type;
