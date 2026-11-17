# Working in KORE Factory

These are this fork's own rules. They sit on top of upstream's [AGENTS.md](../../AGENTS.md), which still applies to the harness code; where the two disagree, this file wins for KORE Factory.

## Branches and releases

- Releases are weekly. `develop` is staging and only `main` is production.
- Features and non-urgent fixes merge into `develop` and ship in Thursday's release, when `develop` is merged into `main`.
- An urgent fix branches from `main`, ships as a patch, and `main` is merged back into `develop` the same day.
- Releases are not numbered yet. Upstream's `v*` tags are never pushed to this repository (see [UPSTREAM.md](../../UPSTREAM.md)).

## Pull requests

- Target `develop`.
- The `Check` job in [ci.yml](../../.github/workflows/ci.yml) must be green.
- Land as a merge commit. Never rebase or force-push a shared branch.
- Commits are conventional commits: `type(scope): summary`, under 72 characters, with a body that says why.

## Checks before a pull request

From the repository root:

```bash
vp fmt --check
```

```bash
vp run check:changed origin/develop
```

`check:changed` runs CI's fast checks for the files your branch changes: format, lint, knip, typecheck of the affected packages and tests beside the changed files. CI's `Check` job then runs format, lint, the full typecheck and the web unit tests. To run those tests yourself, from `apps/web`:

```bash
vp test run --passWithNoTests --project unit
```

For island changes, the island's own tests, also from `apps/web`:

```bash
vp test run src/kore
```

## Where our code lives

- `apps/web/src/kore/`: the island view.
- `apps/server/src/kore/`: our server code, once there is any.
- `docs/kore/`: our documentation, including [the island](island.md) and the [harness notes](harness-notes.md).

Island code imports one way:

- `core/` is plain TypeScript with no React, three.js or app imports, and has unit tests beside each file.
- `feed/` is the only folder that may import the harness (T3 Code's client runtime and app state).
- `scene/` and `hud/` build on the contract in `core/`, plus React, three.js (scene) and the app's `components/ui` (hud).

## Upstream files

Any change to a file that came from upstream gets a row in the table in [UPSTREAM.md](../../UPSTREAM.md), saying why. Our own code goes in new files where it can.

## Dependencies

No new dependency without a reason in the pull request. Versions are pinned.

## What never goes into this repository

It is public. Never commit:

- keys, tokens, passwords or pairing links
- client, company or personal names, email addresses or account ids
- paths from your own machine

World lists are local configuration, not repository content.

## Art

Art is original. No look-alikes of other companies' characters.
