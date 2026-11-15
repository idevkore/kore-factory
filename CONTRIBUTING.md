# Contributing

KORE Factory is early, and its maintainers set its direction. A pull request that changes that direction may be declined, so open an issue first for anything large.

## Bug reports

Bug reports are welcome. Use the bug report form under Issues, and leave out keys, tokens and private project content.

## Pull requests

- Target `develop`.
- Use conventional commit messages: `type(scope): summary`, for example `fix(web): island keeps its camera after a resize`.
- Pass the checks CI runs: formatting, lint, typecheck and the web unit tests. `vp run check:changed` runs the same kind of checks for the files you changed.

## Changes that belong upstream

KORE Factory is a fork of T3 Code. A change to the harness itself that is not specific to KORE Factory belongs upstream in T3 Code.

## Security

Report security problems as [.github/SECURITY.md](.github/SECURITY.md) describes, never in a public issue.
