# Security policy

## Reporting a vulnerability

Report it privately through GitHub: open this repository's **Security** tab and choose **Report a vulnerability**. That opens a private advisory that only you and the maintainers can see.

Do not open a public issue, pull request or discussion for a security problem.

## What to keep out of public places

Never put any of these in a public issue, pull request, commit or discussion:

- secrets: API keys, tokens, passwords, session cookies or pairing links
- exploit details or proof-of-concept code for a problem that is not fixed yet
- logs or project content that contain either of the above

If you posted a secret by mistake, revoke or rotate it first, then tell us in a private report.

## Supported versions

KORE Factory is pre-release and publishes no builds. Only the latest commit on `develop` and on `main` is supported, and fixes land there.

## Upstream

KORE Factory is a fork of T3 Code. A problem in the T3 Code harness itself, rather than in something KORE Factory added, may affect T3 Code too and may also need reporting to that project under its own security policy. Say in your report whether you have done so.
