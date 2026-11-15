# KORE Factory harness notes

Notes for developing KORE Factory on the T3 Code base at tag `v0.1.9`. Everything here was checked against the code or a dev run unless it is marked **unverified**.

## Status

- The dev web server and UI run, and the UI loads with no console errors after pairing.
- Electron desktop dev starts: its logs show the backend ready, `main window created` and the renderer's `dom-ready`. The window itself has not been inspected (**unverified**).
- Product analytics are off unless `T3CODE_TELEMETRY_ENABLED=true`.
- The app is named "KORE Factory" in the two central constants; the tab title reads "KORE Factory (Dev)".
- `/island` renders a React Three Fiber canvas with a WebGL2 context.
- Runs against the Claude provider are recorded under [Claude provider](#claude-provider): one approval accepted, one declined with a note.

## Versions

| Component                | Version                                                                           |
| ------------------------ | --------------------------------------------------------------------------------- |
| Node                     | 26.12.1 (`engines` in the root `package.json`)                                    |
| pnpm                     | 12.14.0 (`packageManager`)                                                        |
| vite-plus (`vp`)         | 1.4.0                                                                             |
| T3 Code                  | tag `v0.1.9`; the app packages still say `0.1.8` in `package.json`                |
| Electron                 | 44.10.1                                                                           |
| React                    | 19.3.0                                                                            |
| `@react-three/fiber`     | 9.8.2 (peer range `react >=19 <19.4`, `three >=0.156`)                            |
| `three` / `@types/three` | 0.180.0 (the version `packages/client-runtime` already uses; not a catalog entry) |

## Running in dev

Node 26 does not ship corepack. pnpm 12.14.0 can still come through corepack by running an older Node's `corepack.js` with Node 26 (`node <corepack.js> pnpm …`), without `corepack enable` or changing the machine's default Node.

From the repository root:

```bash
pnpm install --frozen-lockfile
```

```bash
vp run dev --home-dir "$PWD/.t3" --no-seed
```

```bash
vp run dev:desktop --home-dir "$PWD/.t3/desktop-home" --no-seed
```

- **Data home.** `--home-dir` points the server's data at the git-ignored `.t3` folder. Inside a git worktree the dev runner already defaults there (`packages/shared/src/devHome.ts`, `scripts/dev-runner.ts:732`).
- **`--no-seed` matters.** Without it, the first `vp run dev` copies the real `~/.t3/userdata/statev2.sqlite` into the worktree (`scripts/dev-runner.ts:636`).
- **Ports** come from a hash of the worktree path. Read them from the `[dev-runner]` line, for example `serverPort=… webPort=…`.
- **Pairing.** The web UI asks for pairing. The server logs a one-time `pairingUrl: http://localhost:<webPort>/pair#token=…`; open it once, and the session cookie then survives server restarts. `t3 pair` mints a new token.
- **Telemetry in dev.** `scripts/dev-runner.ts:342` already sets `T3CODE_TELEMETRY_ENABLED=false` for dev runs.
- **Install side effects.** The root `prepare` script, `vp config --no-agent`, sets `core.hooksPath=.vite-hooks/_` in the repository's git config, so the `vp staged` pre-commit hook runs on every commit. A postinstall in the lockfile (`react-native-enriched-markdown`) downloads RaTeX from GitHub releases. The Electron runtime is fetched by Electron's own installer on the first desktop run (`apps/desktop/scripts/ensure-electron-runtime.mjs`).
- **Desktop profile.** Desktop dev keeps Electron's Chromium profile in a fixed folder outside the data home: `t3code-dev` under the OS app-data directory (`apps/desktop/src/app/DesktopUserData.ts:42`).
- **Stopping.** Press Ctrl-C in the terminal that runs the dev command. Signalling only the root `vp` process leaves its children running, and the `vp run dev` tree ignores SIGTERM; SIGINT to every process in the tree stops it.

## What this branch changes

| Commit                                                            | What                                                                                                                                                                           |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `feat(server): telemetry is off unless explicitly enabled`        | `AnalyticsService.ts`: both `Config.withDefault(true)` become `false`. The disabled test now runs for `false` and for an unset variable; the unset case fails on the old code. |
| `feat: name the app KORE Factory`                                 | `APP_BASE_NAME` in `apps/web/src/branding.ts` and `apps/desktop/src/app/DesktopEnvironment.ts`, plus the desktop test that checks the Linux desktop entry.                     |
| `feat(web): add /island route with a three.js canvas`             | `apps/web/src/kore/IslandPage.tsx`, the route file `apps/web/src/routes/_chat.island.tsx`, the regenerated `routeTree.gen.ts`, and the three packages.                         |
| `test(desktop): expect the KORE Factory name in the app identity` | Three identity tests that expected the old name.                                                                                                                               |
| `docs(kore): add upstream routine and harness notes`              | `UPSTREAM.md` and this file.                                                                                                                                                   |

**Telemetry.** `T3CODE_TELEMETRY_ENABLED` gates two senders. The PostHog product analytics in `apps/server/src/telemetry/AnalyticsService.ts` posted to `https://ingest.t3.codes` by default; they are now off unless the variable is `true`. Relay client tracing (`isRelayTracingEnabled`, `packages/shared/src/otelEnvironment.ts:321`) still treats an unset variable as on, but it only exports when a T3 Connect relay is in use and relay trace credentials were baked in at build time. Neither applies to KORE builds; change it too if KORE ever uses the relay.

**Name strings still left.** Still "T3 Code":

- `apps/web/index.html`: the static `<title>T3 Code (Beta)</title>` shown before the app boots, plus the splash `aria-label` and `alt`.
- `apps/desktop/package.json` `productName`, the packaged app name.
- `apps/desktop/scripts/electron-launcher.mjs:16`: the dev bundle `T3 Code (Dev).app`, which macOS shows in the Dock and Activity Monitor.
- About 139 strings in `apps/web/src`, for example `turnDetailAnnouncement.ts:159`, which labels assistant messages "T3 Code", `standalone-page.tsx:26`, and the sidebar's "T3 Code home" link.
- About 64 in `apps/desktop/src`, about 327 in `apps/server/src` (mostly error and log text) and about 31 in `packages/client-runtime/src`.

## The island page

- **Route.** `apps/web/src/routes/_chat.island.tsx` registers `/_chat/island`, which serves `/island`. Under the `_chat` layout it inherits the auth redirect to `/pair` and renders inside the app shell with the thread sidebar, like `/usage`. `__root.tsx` only auto-navigates away from `/`, so `/island` stays put.
- **Page.** `apps/web/src/kore/IslandPage.tsx` renders `<SidebarInset className="h-dvh">`, a full-size wrapper with background `#0A0B0E`, and an R3F `<Canvas>` with a `#D4AF37` box that `useFrame` turns at 0.2 and 0.3 rad/s.
- **Checked in a browser at a 1280×800 viewport.** There is one `<canvas>` with `data-engine="three.js r180"`, CSS size 1024×800 (the width beside the sidebar) and drawing buffer 2048×1600 at dpr 2. `getContext('webgl2')` returns R3F's own context, and `isContextLost()` is false. `frameloop` is `always`, the scene background is `0a0b0e` and the mesh colour `d4af37`. Each frame is one draw call, and the clear colour after a frame is `[10, 11, 14, 255]`. Stepping two frames through R3F's `advance()` moved the rotation from `[0, 0]` to `[6.44, 9.66]`, the expected 2:3 ratio. There were no console errors.
- **Not yet watched in a visible window.** The check ran in a background tab, where `requestAnimationFrame` and `ResizeObserver` do not fire, so R3F sized itself after a `resize` event and frames were stepped by hand. Continuous animation in a visible window is **unverified**.
- **First load after adding the packages is slow:** Vite optimizes `@react-three/fiber` and reloads the page once.
- **Use `frameloop="demand"` for the real island.** `frameloop="always"` repaints every frame, and T3's `AGENTS.md` rules out continuously repainting animations because they peg the GPU on high-refresh displays. The placeholder box keeps `always`; with `demand`, call `invalidate()` when something changes.

## Engineering notes

- **Inherited Claude variables.** A server started from a shell that exports `ANTHROPIC_*` or `CLAUDE*` variables passes them to the Claude CLI it spawns. Only the 12 names in `CLAUDE_HOST_SESSION_VARIABLES` are stripped (`apps/server/src/provider/Drivers/ClaudeHome.ts:50`). Start the server from a clean shell, or strip those variables in `ClaudeHome.ts`.
- **Default runtime mode.** It is `full-access` (`DEFAULT_RUNTIME_MODE`, `packages/contracts/src/providerPolicy.ts:32`), which the Claude adapter maps to `bypassPermissions` (`apps/server/src/orchestration-v2/Adapters/ClaudeAdapterV2.ts:2807`), so no approval is ever requested. Choosing **Supervised** in the composer's permission menu (`runtimeMode: "approval-required"`) maps to Claude's `default` mode and produces approvals. `auto-accept-edits` maps to `acceptEdits`.
- **MCP servers.** The spawned Claude CLI loads the user-level MCP servers from `~/.claude` unless the provider instance has its own config directory (`homePath`, which becomes `CLAUDE_CONFIG_DIR`; see finding (d)).

## Event record

Recorded in the web client by wrapping `MessageEvent.prototype.data` and `WebSocket.prototype.send` for the `/ws` socket, using T3's `Replay (dev)` provider. Replay is an ACP agent (`apps/server/scripts/dev-replay-agent.ts`) that runs through the ACP adapter, not the Claude adapter. The orchestration events and the client side are the ones a Claude thread uses; what the Claude provider itself sends is under [Claude provider](#claude-provider).

The wire is Effect RPC over WebSocket, in JSON text frames:

- requests: `{_tag:"Request", id, tag, payload, …}`
- stream items: `{_tag:"Chunk", requestId, values:[…]}`
- results: `{_tag:"Exit", requestId, exit}`
- plus `Ack`, `Ping`, `Pong` and `Interrupt`.

The two streams that matter are `orchestration.subscribeShell` (all threads) and `orchestration.subscribeThread` (one thread). Thread-stream chunks carry `{kind:"event", sequence, event:{id, threadId, runId, nodeId, driver, providerInstanceId, occurredAt, type, payload}}`.

### Approval flow (scenario "Write approval", permission mode Supervised)

Prompt: "Create a file hello.txt containing the word hi." The replay plays a recorded `printf … > .codex-probe-write-action.txt` request regardless of the text.

1. Send. Out: `orchestration.launchThread` with `{commandId, threadId, projectId, title, creationSource:"web", generateTitle:true, initialMessage:{messageId, text, attachments:[]}, modelSelection:{instanceId:"devReplay", model:"approval"}, runtimeMode:"approval-required", interactionMode:"default", workspaceStrategy:{type:"root", branch:"main"}}`.
2. Shell: `thread.updated` status `preparing`, then `starting`.
3. Out: `orchestration.subscribeThread {threadId, requestCompletionMarker, acceptBoundedSnapshot, acceptDeferredWork, acceptCompactTurnItems, acceptDedupedBodies, acceptCompactIds}`. In: `snapshot`, `synchronized`.
4. Thread stream: `provider-session.attached`; `provider-session.updated`, `provider-thread.updated`, `run.updated` (running), `run-attempt.updated` (running), `node.updated`. Shell: `thread.updated` status `running`.
5. Thread stream: `provider-turn.updated`, `provider-thread.updated`, `node.updated`, `turn-item.updated` (a `command_execution` item, status `pending`).
6. **Approval request.** Thread stream: `node.updated`, `runtime-request.updated`, `turn-item.updated` (the `approval_request` item), `thread.metadata-updated` (generated title). Shell: `thread.updated` with `status: "running"` and `pendingRuntimeRequest: {id, kind:"command", createdAt, blocking:true}`. The UI shows "Needs approval" with Decline, Approve and More.
7. **Approval reply** (Approve). Out: `orchestration.dispatchCommand` with `{type:"runtime-request.respond", commandId, threadId, requestId, decision:"accept"}`. In: `Exit` Success.
8. Thread stream: `runtime-request.updated` (status `resolved`), `node.updated`, `turn-item.updated` (`approval_request` completed). Shell: `thread.updated` running, no pending request.
9. Thread stream: `turn-item.updated` (`command_execution` completed), `message.updated`, `turn-item.updated` (`assistant_message` completed), `provider-turn.updated`, `provider-thread.updated`, `run-attempt.updated` (completed), `run.updated` (`waiting`). Shell: `waiting`.
10. Thread stream: `checkpoint.captured` ×2, `turn-item.updated` (`checkpoint`), `run.updated` (`completed`). Shell: `thread.updated` status `completed`.

Opening a thread also sends `orchestration.dispatchCommand {type:"thread.visit"}` and gets `thread.visited` back.

Shape of the approval request (ids shortened):

```json
// runtime-request.updated payload
{
  "id": "runtime-request:provider:acpRegistry:…",
  "nodeId": "node:runtime-request:…",
  "providerTurnId": "provider-turn:…",
  "nativeRequestRef": { "driver": "acpRegistry", "nativeId": "…-write-probe", "strength": "weak" },
  "kind": "command",
  "status": "pending",
  "responseCapability": { "type": "live", "providerSessionId": "provider-session:…" },
  "createdAt": "<ISO time>",
  "resolvedAt": null
}
// turn-item.updated payload: the approval card
{
  "type": "approval_request",
  "id": "turn-item:runtime-request:…",
  "requestId": "runtime-request:provider:acpRegistry:…",
  "requestKind": "command",
  "prompt": "printf '…' > .codex-probe-write-action.txt",
  "status": "waiting",
  "threadId": "…", "runId": "…", "providerTurnId": "…", "nodeId": "…",
  "nativeItemRef": { "driver": "acpRegistry", "nativeId": "…-write-probe", "strength": "weak" },
  "ordinal": 1000004, "parentItemId": null, "title": null,
  "startedAt": "…", "updatedAt": "…", "completedAt": null
}
```

The approval card has no tool name or tool input of its own. The tool call is the sibling `command_execution` item (`input` holds the command, `title` "Ran command"). The two share `nativeItemRef.nativeId`, and they do for Claude too.

### Question flow (scenario "Question")

- **Request.** `runtime-request.updated` with `kind:"user_input"` and status `pending`, and `turn-item.updated` with `type:"user_input_request"`, `requestId` and `questions:[{id:"schema_vs_ui_flexibility", header:"Fixture", question:"Should this fixture prefer strict schemas or UI flexibility?", options:[{label, description, value}], allowCustomAnswer:false}]`. The shell's `pendingRuntimeRequest.kind` is `user_input`. The UI shows "Needs your input".
- **Answer.** Picking a single-select option sends it at once: `orchestration.dispatchCommand` with `{type:"runtime-request.respond", commandId, threadId, requestId, answers:{"schema_vs_ui_flexibility":"Strict schemas (Recommended)"}}`.
- **Then** `runtime-request.updated` (resolved), `turn-item.updated` (`user_input_request` completed), and the same completion sequence as the approval flow.

### Claude provider

Recorded the same way with Claude Haiku 5.5 in Supervised mode, on two prompts: "Create a file hello.txt containing the word hi." (approved) and "Create a file bye.txt containing the word bye." (declined with a note). `orchestration.launchThread` carried `runtimeMode:"approval-required"` and `modelSelection:{instanceId:"claudeAgent", model:"claude-haiku-5-5"}`.

- **Driver.** Events and native refs carry `driver: "claudeAgent"`. Native refs are `strength: "strong"` (Replay's are `weak`), and `nativeId` is Claude's tool-use id (`toolu_…`).
- **Request.** A shell command arrives as `runtime-request.updated` with `kind: "command"`, `status: "pending"` and `responseCapability: {type: "live", providerSessionId, supportsFeedback: true}`. Replay's live capability has no `supportsFeedback`, and the orchestrator refuses `feedback` without it (`apps/server/src/orchestration-v2/Orchestrator.ts:9667`). So a deny note is accepted for Claude and not for Replay, and the island's `acceptsNote` is true for Claude.
- **Approval item.** `turn-item.updated` with `type: "approval_request"`, `requestKind: "command"`, `prompt` holding the full shell command, `title: null` and `status: "waiting"`. Its `nativeItemRef` equals that of the sibling `command_execution` item, so the approval and its tool call share `nativeItemRef.nativeId`, as with Replay.
- **Tool-call item.** `command_execution` with `input` holding the command and `title: null`. Its status is `running` while the approval waits; Replay's is `pending`.
- **Accept** (`decision: "accept"`). The request becomes `resolved` with `decision: "accept"` and `resolvedAt` set. The command runs, and the run goes `waiting`, then `completed`.
- **Decline with a note** (`decision: "decline"`, `feedback`). The request becomes `resolved` with `decision: "decline"` and the `feedback` text. The `approval_request` item ends `cancelled` (not `completed`) and the `command_execution` item `failed`. The thread view shows the note as a user message; Claude replies that it did not run the command, and the run ends `completed` without retrying.
- **Titles.** A generated title replaces the prompt-derived one a few seconds into the run, as with Replay.
- **Launch.** A thread started from the composer can show in the shell for a moment with no run (`idle`) before `preparing`.

## Findings for building the island

### (a) Subscribing to threads and to one thread

- **All threads, with status and pending requests:** the shell stream.
  - RPC `orchestration.subscribeShell` (`packages/contracts/src/orchestrationV2.ts:3637`). Its items are `OrchestrationV2ShellStreamItem` (around `:2261`), of kinds `synchronized`, `snapshot-required`, `snapshot`, `project.updated`, `project.removed`, `thread.updated {location, thread}` and `thread.removed`.
  - Each `thread` is an `OrchestrationV2ThreadShell` (`:2101`). Its `status` is `idle` or a run status (preparing, queued, starting, running, waiting, completed, interrupted, failed, cancelled, rolled_back), and `pendingRuntimeRequest` is `{id, kind, createdAt, blocking}`.
- **The same in `apps/web`:** the hooks in `apps/web/src/state/entities.ts`.
  - `useThreadShells` (`:104`), `useVisibleThreadShells` (`:121`), `useQuietThreadShells` (`:164`, which the sidebar uses at `components/Sidebar.tsx:1103`), `useThreadShell(ref)` (`:150`), `useProjects` (`:95`) and `useProject(ref)` (`:146`).
  - They return `EnvironmentThreadShell` (`packages/client-runtime/src/state/models.ts:137`), which adds `hasPendingApprovals` and `hasPendingUserInput` (derived in `presentThreadShell`, `models.ts:258`).
- **One thread in detail:** RPC `orchestration.subscribeThread` (`orchestrationV2.ts:3638`), with items `OrchestrationV2ThreadStreamItem` (`:3958`). The domain event types form the union `OrchestrationV2DomainEvent` (`:1893`):
  - `thread.*`: created, archived, unarchived, deleted, settled, unsettled, snoozed, unsnoozed, pinned, unpinned, auto-settle-set, pin-reordered, active-reordered, tags-updated, visited, marked-unread, metadata-updated, pull-request-synced, pull-request-link-updated, runtime-mode-updated, interaction-mode-updated, model-selection-updated, provider-switched, guest-share-updated
  - runs: `run.created`, `run.updated`, `run.background-work-cancelled`, `run-attempt.created`, `run-attempt.updated`
  - nodes and providers: `node.updated`, `subagent.updated`, `provider-session.attached`, `provider-session.updated`, `provider-session.detached`, `provider-thread.updated`, `provider-turn.updated`
  - content: `runtime-request.updated`, `message.updated`, `turn-item.updated`, `plan.updated`
  - checkpoints and context: `checkpoint-scope.created`, `checkpoint.captured`, `checkpoint.rollback-requested`, `context-handoff.updated`, `context-transfer.created`, `context-transfer.updated`

  There is no separate thread-status event: status comes from `run.*` and reaches the list through the shell's `thread.updated`.

- **One thread in `apps/web`:** `useThreadProjection(ref)` (`state/entities.ts:174`) or `useEnvironmentThread(environmentId, threadId)` (`state/threads.ts:54`).
  - Pending requests for a thread come from `derivePendingThreadRequests(projection)` (`packages/client-runtime/src/state/threadRequests.ts:226`), wrapped by `derivePendingApprovals` and `derivePendingUserInputs` in `apps/web/src/session-logic.ts`.
  - The atoms behind them are in `packages/client-runtime/src/state/orchestration.ts:153-160` and `state/threads.ts`.
  - For the island, the shell hooks are enough to place robots and flag pending work. Subscribe to a thread only when the user focuses one.

### (b) Approve, deny, answer

- **One command for all three:** `orchestration.dispatchCommand` with `type:"runtime-request.respond"` (`orchestrationV2.ts:3318`), built by `respondToThreadApproval` and `respondToThreadUserInput` in `packages/client-runtime/src/operations/commands.ts:883` and `:896`.
- **Approve or deny:** `{threadId, requestId, decision}` plus optional `feedback`. `decision` is a `ProviderApprovalDecision` (`packages/contracts/src/providerPolicy.ts:58`): `accept`, `acceptForSession`, `acceptAlways`, `decline` or `cancel`. The UI's buttons are in `ComposerPendingApprovalActions.tsx`: Approve sends `accept`, Decline sends `decline`, and the rest sit under More.
- **Answer:** `{threadId, requestId, answers:{[questionId]: string | string[]}}` plus optional `attachmentsByQuestionId`. A question is dismissed with `type:"thread.user-input.dismiss"`.
- **In React,** reuse `usePendingThreadRequests` (`apps/web/src/components/chat/usePendingThreadRequests.ts`): `onRespondToApproval(requestId, decision, feedback?)` at `:262` and `onRespondToUserInput(requestId, answers)` at `:299`. They call `threadEnvironment.respondToApproval` and `.respondToUserInput` through `useOrchestrationCommand`, which checks the environment's operate scope. Only requests with `responseCapability.type === "live"` can be answered.

### (c) Projects, threads, navigation

- **Projects.** A project is an `OrchestrationProjectShell` (`packages/contracts/src/orchestrationProject.ts:8`: `id`, `title`, `workspaceRoot`, `scripts`, defaults and more). A thread carries `projectId`. In the client both are scoped by environment: `scopeThreadRef(environmentId, threadId)` and `scopeProjectRef` (`packages/client-runtime/src/environment/scoped.ts`).
- **Thread URL:** `/$environmentId/$threadId`, for example `/<environmentId>/<threadId>`; thread ids with `:` are URL-encoded. Navigate with `router.navigate({ to: "/$environmentId/$threadId", params: buildThreadRouteParams(threadRef) })`, as `components/Sidebar.tsx:1455` does. `buildThreadRouteParams` is in `apps/web/src/threadRoutes.ts:58`. Drafts live at `/draft/$draftId`.
- **Routes** are file-based (`apps/web/src/routes/`, plugin `tanstackRouter({ autoCodeSplitting: true })` at `apps/web/vite.config.ts:282`). The dev server regenerates `routeTree.gen.ts` when a route file is added.

### (d) Per-project environment variables

- **Projects can't carry them.** `ProjectSettingsOverrides` (`packages/contracts/src/settings.ts:1190`) has no env field; for providers it only enables or disables instances per project.
- **Provider instances can.** `ProviderInstanceConfig.environment` (`packages/contracts/src/providerInstance.ts:79`) is a list of `{name, value | secret reference, sensitive}`, edited under Settings → Providers → Environment → Variables. The Claude instance's `homePath` setting becomes `CLAUDE_CONFIG_DIR` (`settings.ts:778`, `apps/server/src/provider/Drivers/ClaudeHome.ts:44`).
- **So:** one Claude instance per account or config directory, each with its own env, enabled for the projects that should use it. The spawn path merges the host env, the instance env and `CLAUDE_CONFIG_DIR` in `ClaudeHome.ts` and passes the result to the Agent SDK in `ClaudeAdapterV2.ts`. The end-to-end effect of a second instance is **unverified**.

### (e) Two servers at once

- **Yes, with separate data homes and ports.** This was verified by running the web dev server (home `.t3`) and the desktop dev backend (home `.t3/desktop-home`) at the same time; both answered `/.well-known/t3/environment`.
- **The lock is per state directory:** `server-owner.sqlite` (`apps/server/src/serverOwnership.ts:191`) and the `server-runtime.json` pid check (`apps/server/src/cli/config.ts:359`). The data home is chosen by `--base-dir`/`--home-dir`, then `T3CODE_HOME`, then `~/.t3`.
- **What can still collide** (from the code, **unverified** by a run):
  - two desktop apps (`requestSingleInstanceLock` in `apps/desktop/src/app/DesktopClerk.ts:115`, and the fixed `t3code-dev`/`t3code-v2` Electron profile)
  - the background boot service, which has one fixed launchd label (`apps/server/src/cloud/bootService.ts:42`)
  - desktop mode's default port 3773
  - Claude's `~/.claude` when no instance sets `CLAUDE_CONFIG_DIR`

### (f) Repo checks that will bite

- **`vp run check:changed`** (`scripts/check-changed.ts`) runs format, lint, both knip passes, unused patches, the graphql check, typecheck of affected packages and their dependents, and tests beside changed files. Touching any `package.json` or `pnpm-lock.yaml` makes it run everything, which takes several minutes.
- **Format:** `vp fmt` (oxfmt) with `sortPackageJson`. New files must pass it; `IslandPage.tsx` needed one `vp fmt` pass.
- **Lint:** `vp lint` with `oxlint-plugin-t3code` and `@shadcn/lint`, configured in the root `vite.config.ts`. The rules most likely to bite island code:
  - `no-manual-memo`: no `useMemo`, `useCallback` or `memo` in web; the React Compiler handles it.
  - `no-unreasoned-state-sync`: every `useEffect` needs a disable comment with a reason.
  - `no-raw-resize-observer` and `no-em-dash-copy` (no em dash in UI text).
  - `no-native-title-tooltip`, `no-sparkles-icon`, `no-low-value-comments`, `no-hookless-use-function` and `require-suppression-reason`.
  - shadcn's `no-restyle` (only layout classes on `components/ui` exports), `no-raw-colors` and `no-arbitrary-values`.

  Raw hex colours in inline `style` and in R3F props pass lint.

- **Restricted imports:** no bare `@t3tools/client-runtime` import; use subpaths.
- **knip:** unused files, dependencies and exports fail in apps/web (`knip.jsonc`). `@types/three` passes because the page imports a type from `three`.
- **Catalog and peers:** nothing forces `catalog:`; apps/web mixes catalog and pinned versions. `strictPeerDependencies: true` (`pnpm-workspace.yaml:269`) fails installs on unmet peers, so R3F's `react <19.4` peer blocks any React upgrade past 19.3. `minimumReleaseAgeExclude` exists, but the effective release-age threshold is **unverified**.

## Before this goes public

These are read-only findings from the code as of `v0.1.9`. Nothing in this section has been changed.

### (a) GitHub Actions workflows

There are 25 files in `.github/workflows/`. Two facts decide what happens in a new repository:

- Most jobs run on Blacksmith runners (`runs-on: blacksmith-…`). Those exist only for accounts that installed Blacksmith, so in our repository such a job waits for a runner and never starts. Only the jobs on `ubuntu-*` runners actually run.
- Some jobs only run when `github.repository == 'pingdotgg/t3code'`. They skip in any other repository, though a schedule still starts the workflow.

| Workflow                            | Triggers                                                                                                      | Secrets it expects                                                                                                                                                                                                                                                                                                                     | Publishes, deploys or writes                                                                                         | In our public repo                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `agent-context-budget.yml`          | pull_request                                                                                                  | none                                                                                                                                                                                                                                                                                                                                   | nothing (a size check)                                                                                               | Runs on every PR (GitHub runner)                                                                                           |
| `ci.yml`                            | pull_request; push to `main`                                                                                  | `T3_TASK_CACHE_READ_TOKEN` (T3's remote task cache)                                                                                                                                                                                                                                                                                    | build artifacts and a job summary only                                                                               | Starts on every PR and push; Blacksmith jobs never get a runner                                                            |
| `deploy-relay.yml`                  | push to `main`; workflow_dispatch                                                                             | `CLOUDFLARE_API_TOKEN`, `PLANETSCALE_API_TOKEN_ID`, `PLANETSCALE_API_TOKEN`, `AXIOM_TOKEN`, `CLERK_SECRET_KEY`, `APNS_PRIVATE_KEY`, `FCM_SERVICE_ACCOUNT`, `T3CHAT_LINK_SECRET`, plus vars                                                                                                                                             | deploys the T3 Connect relay to Cloudflare                                                                           | Skipped (repository guard)                                                                                                 |
| `desktop-macos-preview.yml`         | pull_request labeled `preview:mac`                                                                            | none                                                                                                                                                                                                                                                                                                                                   | builds a macOS preview artifact                                                                                      | Only with that label                                                                                                       |
| `desktop-macos-preview-publish.yml` | workflow_run (after the macOS preview); pull_request_target closed or unlabeled                               | `GITHUB_TOKEN`, `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`, `MACOS_PROVISIONING_PROFILE`                                                                                                                                                                                                  | signs and notarizes, creates preview GitHub releases, deletes their assets when the PR closes                        | Cleanup runs on every closed PR (GitHub runner); publishing needs the label flow                                           |
| `issue-labels.yml`                  | push to `main` (issue templates or itself); workflow_dispatch                                                 | none (`issues: write`)                                                                                                                                                                                                                                                                                                                 | creates and updates the repository's issue labels                                                                    | Runs on the first push to `main`                                                                                           |
| `mobile-android-apk.yml`            | schedule hourly (`23 * * * *`); workflow_dispatch                                                             | `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`                                                                                                                                                                                                                                                                                                     | mirrors the newest beta APK                                                                                          | Skipped (guard); started hourly                                                                                            |
| `mobile-dev-client.yml`             | push to `main` (mobile paths); pull_request (its own files); workflow_dispatch                                | `T3_TASK_CACHE_READ_TOKEN`, `T3_NATIVE_CLIENT_WRITE_TOKEN`                                                                                                                                                                                                                                                                             | builds native dev clients and shares them through T3's cache                                                         | Skipped (guard)                                                                                                            |
| `mobile-eas-preview.yml`            | pull_request                                                                                                  | `EXPO_PREVIEW_TOKEN`, `GITHUB_TOKEN`                                                                                                                                                                                                                                                                                                   | Expo EAS builds and updates, PR comments                                                                             | Only with the label `🚀 Mobile Continuous Deployment`                                                                      |
| `mobile-eas-preview-fork.yml`       | pull_request_target labeled                                                                                   | `EXPO_PREVIEW_TOKEN`, `GITHUB_TOKEN`                                                                                                                                                                                                                                                                                                   | the same for PRs from forks                                                                                          | Only with that label                                                                                                       |
| `mobile-eas-production.yml`         | push to `main` (mobile paths); workflow_dispatch                                                              | `EXPO_PRODUCTION_TOKEN`, `RELEASE_APP_ID`, `RELEASE_APP_PRIVATE_KEY`, `MOBILE_SOURCEMAPS_R2`                                                                                                                                                                                                                                           | production EAS builds, store submissions (TestFlight, Play), over-the-air updates                                    | Skipped (guard)                                                                                                            |
| `mobile-fingerprint-check.yml`      | pull_request                                                                                                  | none                                                                                                                                                                                                                                                                                                                                   | artifact only                                                                                                        | Starts on PRs; Blacksmith runner                                                                                           |
| `mobile-fingerprint-label.yml`      | workflow_run (after the fingerprint check)                                                                    | none                                                                                                                                                                                                                                                                                                                                   | labels the PR                                                                                                        | Runs after that check                                                                                                      |
| `mobile-showcase-screenshots.yml`   | workflow_dispatch                                                                                             | none                                                                                                                                                                                                                                                                                                                                   | screenshot artifacts                                                                                                 | Manual only                                                                                                                |
| `pr-size.yml`                       | pull_request_target                                                                                           | none                                                                                                                                                                                                                                                                                                                                   | labels PRs by size                                                                                                   | Runs on every PR                                                                                                           |
| `pr-vouch.yml`                      | pull_request_target; issue_comment `/recheck-vouch`; push to `main` (`VOUCHED.td` or itself)                  | `GITHUB_TOKEN`                                                                                                                                                                                                                                                                                                                         | labels PRs `vouch:unvouched` or `vouch:denounced` against `.github/VOUCHED.td`, which lists T3's contributors        | Runs on every PR; our own PRs would be marked unvouched                                                                    |
| `publish-aur.yml`                   | workflow_call; workflow_dispatch                                                                              | `AUR_SSH_PRIVATE_KEY`                                                                                                                                                                                                                                                                                                                  | publishes the Arch Linux AUR package                                                                                 | Skipped (guard)                                                                                                            |
| `relay-preview.yml`                 | pull_request                                                                                                  | `CLOUDFLARE_API_TOKEN`, `PLANETSCALE_API_TOKEN_ID`, `PLANETSCALE_API_TOKEN`, `AXIOM_TOKEN`, `CLERK_SECRET_KEY`, `T3CHAT_LINK_SECRET`                                                                                                                                                                                                   | deploys a relay preview to Cloudflare                                                                                | Only with the label `relay:preview`                                                                                        |
| `relay-preview-cleanup.yml`         | schedule daily (`17 7 * * *`); pull_request_target unlabeled or closed; workflow_dispatch                     | the same Cloudflare, PlanetScale, Axiom and Clerk secrets                                                                                                                                                                                                                                                                              | destroys relay previews                                                                                              | No repository guard: the daily run starts on `main` and waits for a Blacksmith runner                                      |
| `release.yml`                       | push of tags `v*.*.*` (not nightly or preview); schedule every 30 minutes (`8,38 * * * *`); workflow_dispatch | `T3_TASK_CACHE_READ_TOKEN`, `CLOUDFLARE_API_TOKEN`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `OPENAI_API_KEY`, `AUR_SSH_PRIVATE_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RELEASE_APP_ID`, `RELEASE_APP_PRIVATE_KEY`, `DISCORD_RELEASE_WEBHOOK_URL`, `DISCORD_RELEASE_NIGHTLY_ROLE_ID`, `DISCORD_RELEASE_LATEST_ROLE_ID` | GitHub releases with desktop builds, the `t3` npm package, AUR, Vercel and marketing deploys, a Discord announcement | Every job hangs off a guarded first job, so it skips; it still starts every 30 minutes and on any pushed upstream `v*` tag |
| `release-desktop.yml`               | workflow_call                                                                                                 | `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`, `MACOS_PROVISIONING_PROFILE`, the `AZURE_*` trusted-signing set                                                                                                                                                                               | builds and signs desktop artifacts for the two workflows above                                                       | Only when called                                                                                                           |
| `stale-needs-more-info.yml`         | schedule daily (`17 6 * * *`); workflow_dispatch                                                              | none (`issues: write`)                                                                                                                                                                                                                                                                                                                 | closes issues labeled "needs more info" 7 days after the label                                                       | Runs daily; acts only on that label                                                                                        |
| `thread-transfer-report.yml`        | workflow_run (after CI)                                                                                       | `GITHUB_TOKEN`                                                                                                                                                                                                                                                                                                                         | comments on PRs                                                                                                      | Runs after CI on PRs                                                                                                       |
| `web-preview.yml`                   | pull_request                                                                                                  | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`                                                                                                                                                                                                                                                                                   | deploys a web preview to Vercel, comments                                                                            | Only with the label `preview:web`                                                                                          |
| `windows-tests.yml`                 | workflow_dispatch                                                                                             | none                                                                                                                                                                                                                                                                                                                                   | nothing                                                                                                              | Manual only                                                                                                                |

The repository also holds `.coderabbit.config.ts` (the CodeRabbit review bot) and `vercel.ts` with `.vercelignore` (Vercel project config). They do nothing unless those apps are connected to our repository.

**Before the first push**, disable Actions for the repository or remove the workflows we don't want. Push branches only, never with `--tags` or `--follow-tags`: the clone carries T3's `v*` tags, and a pushed `v*.*.*` tag starts `release.yml`.

### (b) Where the local server listens and how the web client signs in

- **Bind address.** With no host set, the server listens on `127.0.0.1` only (`loopbackBindAddress` in `apps/server/src/auth/utils.ts:61`; the host is chosen in `apps/server/src/cli/config.ts:422-441`). Desktop mode binds `127.0.0.1` too, and dev runs log `Listening on http://127.0.0.1:<port>`. The server listens beyond loopback only when told to:
  - `--host` or `T3CODE_HOST`
  - `--lan` or `T3CODE_LAN=true`, which binds `0.0.0.0`
  - a web-mode server run by T3's background service with `T3CODE_LAN` unset, which also binds `0.0.0.0`
  - `--tailscale-serve`, which publishes it on the tailnet
- **Dev web server.** Vite stays on loopback and proxies `/api`, `/ws`, `/oauth` and `/.well-known` to the backend (`scripts/dev-runner.ts:91`; the proxy is in `apps/web/vite.config.ts:349-360`).
- **Authentication.** The local server has no account login. It mints one-time pairing tokens: at startup it logs a pairing URL with the token in the `#` fragment, and `t3 pair` mints more. Then:
  1. The web client trades the token at `POST /api/auth/browser-session` for an HttpOnly, SameSite=Lax session cookie (`apps/server/src/auth/http.ts:203-210`).
  2. `GET /api/auth/session` checks the cookie.
  3. The WebSocket at `/ws` opens with a short-lived ticket from `POST /api/auth/websocket-ticket` (routes in `packages/contracts/src/environmentHttp.ts:563-624`, client in `packages/client-runtime/src/authorization/remote.ts:192`).
  4. Each RPC method then checks scopes (`apps/server/src/auth/RpcAuthorization.ts`).

  A dev run shows exactly this sequence: the pair page, `/api/auth/session` 200, `/api/auth/websocket-ticket/rpc` 200, then the WebSocket upgrade.

- **Desktop.** The desktop renderer gets its credential from the Electron main process (its traces show `desktopBootstrapToken.current`), and the CLI also accepts `--bootstrap-fd`. That path is **unverified** beyond the trace names.

### (c) Other traffic to T3-owned hosts

Besides the PostHog analytics (`ingest.t3.codes`, now off by default):

- **T3 Connect (relay and sign-in).** `apps/server/src/cloud/publicConfig.ts`. Cloud features turn on only when both of these are set (`publicConfig.ts:222`): a relay URL (`T3CODE_RELAY_URL`, or `__T3CODE_BUILD_RELAY_URL__` baked in at build time) and a Clerk publishable key. The desktop build bakes a Clerk key from `T3CODE_CLERK_PUBLISHABLE_KEY` (`apps/desktop/vite.config.ts:14`). KORE builds set neither, so Connect stays off; T3's release builds set both. When on, the relay carries:
  - the tunnel
  - agent activity publishing (the server logs `agent activity publishing standby; waiting for T3 Connect link reconciliation`)
  - relay client traces (`isRelayTracingEnabled`, still on when `T3CODE_TELEMETRY_ENABLED` is unset)
- **Desktop auto-update.** electron-updater reads the GitHub Releases feed written into `app-update.yml` at package time, from `T3CODE_DESKTOP_UPDATE_REPOSITORY` or `GITHUB_REPOSITORY` (`scripts/build-desktop-artifact.ts:2690`). A build made in our repository points at our releases, not T3's. It is off in dev and unpackaged runs (`apps/desktop/src/updates/DesktopUpdates.ts:352`) and when `T3CODE_DISABLE_AUTO_UPDATE` is set. The startup-recovery screen links to T3's releases page (`apps/desktop/src/app/DesktopStartupRecovery.ts:21`).
- **npm version check.** The `serverGetNpmRelease` RPC requests `https://registry.npmjs.org/t3/<spec>` (`apps/server/src/cloud/npmRelease.ts:66`). This reads T3's package from the public npm registry; no T3 host is involved.
- **Triage.** A user-started agent whose prompt (`apps/server/src/triage/triagePrompt.ts`):
  - fetches T3's playbook from `raw.githubusercontent.com/pingdotgg/t3code`
  - searches T3's GitHub issues
  - drafts a `github.com/pingdotgg/t3code/issues/new` link and hands it to the user. Whether the agent ever files the issue itself is **unverified**.
- **Links that send nothing unless the user opens them:**
  - `t3.codes/download`, `/mobile` and `/privacy-policy`, and the `install.sh`/`install.ps1` commands shown in the UI and CLI
  - `app.t3.codes` thread links for outside MCP clients (`apps/server/src/auth/McpOAuth.ts:596`)
  - `nightly.app.t3.codes` (`publicConfig.ts:118`)
  - `t3.chat/settings/subscription`
  - the `t3.codes/schema/t3.json` schema URL
- **Crash reports:** none in the server, desktop or web code (no Sentry or other crash reporter). The Codex provider's `uploadFeedback` goes to OpenAI through the Codex app server, not to T3. `apps/web/index.html` loads nothing from outside.
- **Not checked:** `apps/mobile` and the hosted marketing site.

## Checks

These are the root `package.json` commands, run on this branch with Node 26.12.1 on macOS.

| Command                                                      | Result                                                                                                                                       |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `vp run check:changed`                                       | Pass: format, lint, both knip passes, unused patches, graphql, typecheck (41 packages), tests beside changed files, React Compiler coverage. |
| `vp run lint` (`vp lint --report-unused-disable-directives`) | Pass. Warnings only, all in files this branch does not touch.                                                                                |
| `vp run typecheck`                                           | Pass, 41/41 packages.                                                                                                                        |
| `vp run test` (`vp run -r test`)                             | Fails, and every failure also happens on untouched `v0.1.9` on macOS. Details below.                                                         |

`vp run -r test` stops starting new packages after the first failing one, so each package was also run on its own (`vp run --filter <package> test`). These failures are identical on a clean `v0.1.9` checkout:

| Package                | Failing tests                                                                                                                                                                                                                                                                                                                                                                                                                                    | On `v0.1.9`       |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| `@t3tools/scripts`     | `build-npm-launcher.test.ts`: 1 test. It expects `/var/folders/…` and gets `/private/var/folders/…`, because the macOS temp folder is a symlink. The other 35 files pass.                                                                                                                                                                                                                                                                        | Same failure      |
| `t3` (`apps/server`)   | 11 tests in 10 files: `cli/invocation.test.ts` (2), `environment/ServerEnvironment.test.ts`, `preview/ServerBrowserPage.test.ts` (2), `process/externalLauncher.test.ts`, `project/AgentSessionScanner.test.ts`, `provider/AntigravityInstallation.test.ts`, `provider/Drivers/ClaudeSkills.test.ts`, `storageCleanup.test.ts`, `usage/UsageService.test.ts` (2), `vcs/GitVcsDriverCore.test.ts`. 7124 tests pass, including the telemetry test. | Same 11 fail      |
| `@t3tools/desktop`     | `DesktopLinuxUrlHandler.test.ts`: 2 tests that write `com.t3tools.T3Code.png` and `com.t3tools.t3code.png` side by side, which a case-insensitive disk cannot hold (likely cause). 1015 tests pass.                                                                                                                                                                                                                                              | Same 2 fail       |
| `@t3tools/provider-fx` | `src/server/skills.test.ts`: 2 tests.                                                                                                                                                                                                                                                                                                                                                                                                            | Same 2 fail       |
| `@t3tools/web`         | All 4881 unit tests pass. The browser project needs Playwright's `chrome-headless-shell`, which is downloaded from Playwright's CDN rather than the npm registry; without it, 199 of 548 test files do not run.                                                                                                                                                                                                                                  | Same launch error |

Every other package passes: client-runtime (1899), contracts (171), effect-acp (78), effect-codex-app-server (48), provider-acp-registry (61), provider-acp (102), provider-core (227), provider-cursor (121), provider-grok (83), provider-kiro (3), provider-muse (105), provider-opencode (180), provider-pi (181), secret-provider-core (8), secret-provider-onepassword (7), shared (1559), the eight source-control packages, ssh (34), tailscale (8), relay (305), task-cache (41), oxlint-plugin-t3code (396), evals (984) and mobile (3375).

Most of these failures look environmental: the macOS `/private/var` symlink, a case-insensitive disk, and the missing Playwright browser. For provider-fx, ClaudeSkills and UsageService the cause is **unverified**.
