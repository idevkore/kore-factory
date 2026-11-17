# KORE Factory

[![Check on main](https://github.com/idevkore/kore-factory/actions/workflows/ci.yml/badge.svg?branch=main&event=push)](https://github.com/idevkore/kore-factory/actions/workflows/ci.yml?query=branch%3Amain+event%3Apush)
[![Check on develop](https://github.com/idevkore/kore-factory/actions/workflows/ci.yml/badge.svg?branch=develop&event=push)](https://github.com/idevkore/kore-factory/actions/workflows/ci.yml?query=branch%3Adevelop+event%3Apush)

Each badge shows whether the `Check` job (format, lint, typecheck and the web unit tests) passed on the latest push to that branch: `main` is production, `develop` is staging.

KORE Factory is a desktop harness for AI coding-agent sessions. Next to the usual list of sessions it has a second, visual view, the island, where each session appears as a figure on the map: when an agent asks for approval or has a question, you approve, decline or answer it in place.

## Status

Early. It runs from source in development, but it is not ready for everyday use, no builds are published and there are no releases yet.

## Run it in development

You need Git, Node 26.12.1 and pnpm 12.14.0 (the versions in `package.json`). To run real agent sessions, install and sign in to at least one provider's command line, such as Claude Code or Codex. Development runs also offer a free `Replay (dev)` provider that plays back recorded turns.

### Install `vp`

The commands use `vp`, the [Vite+](https://viteplus.dev/guide/) command line. Installing the dependencies brings a copy, which `pnpm exec vp` runs; if you install Vite+ globally instead, drop the `pnpm exec`.

### Start it

From the repository root:

```bash
pnpm install --frozen-lockfile
```

```bash
pnpm exec vp run dev --home-dir "$PWD/.t3" --no-seed
```

- `--home-dir "$PWD/.t3"` keeps the app's data in the repository's git-ignored `.t3` folder, and `--no-seed` starts with an empty database instead of copying one from an existing T3 Code install.
- The output names the ports (`[dev-runner] … webPort=…`) and prints a one-time pairing link. Open that link once in your browser to sign in, and never share it.
- Open the island with the Island button at the foot of the sidebar, "Open island" in the command palette, or at `/island`.
- Press Ctrl-C to stop.

## Documentation

- [The island](docs/kore/island.md): what it shows and how to use it.
- [Rules for working in this repository](docs/kore/rules.md) and [contributing](CONTRIBUTING.md).
- [Harness notes](docs/kore/harness-notes.md): how the T3 Code base behaves in development.
- [Upstream](UPSTREAM.md): which of T3 Code's files we changed, and how we take its releases.

## Built on T3 Code

KORE Factory is a fork of [T3 Code](https://github.com/pingdotgg/t3code) at `v0.1.9`, used under the MIT licence. It is not affiliated with or endorsed by T3 Tools. Parts of the interface, and the guides in `docs/` outside `docs/kore/`, still carry the T3 Code name until the rename is finished.

## Security

To report a vulnerability, see [.github/SECURITY.md](.github/SECURITY.md).

## Licence

MIT. See [LICENSE](LICENSE).
