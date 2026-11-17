# The island

`/island` shows every recent session (a T3 thread) as a figure on an island. Sessions are grouped into worlds, one island (atoll) per world, and the page shows one world at a time. Where a figure stands and how it looks follow the session's real state, and a side panel answers the session's open approval or question in place. Open it from the command palette ("Open island") or at `/island`.

## Sessions, stations and figures

A session's state comes from the thread list, without opening the thread. A pending approval wins, then a pending question, then the run status.

| Run status or request                     | State            | Station  |
| ----------------------------------------- | ---------------- | -------- |
| `preparing`, `queued`, `starting`         | `starting`       | `intake` |
| `running`, `waiting`                      | `working`        | `work`   |
| pending approval                          | `needs_approval` | `gate`   |
| pending question                          | `needs_answer`   | `gate`   |
| `idle`, or never run                      | `idle`           | `home`   |
| `completed`                               | `done`           | `home`   |
| `interrupted`, `cancelled`, `rolled_back` | `stopped`        | `home`   |
| `failed`                                  | `failed`         | `home`   |

Stations are places a session stands by its state, not kinds of work: new sessions wait at intake, running ones stand at work, ones held for the user wait at the gate, and everything else reports back home, where the commander stands. Each station has a keeper figure. A session figure's colour follows its state, and a marker beside it means "this session needs you" and nothing else.

- **Which sessions show.** Not archived, and either active (`starting`, `working`, `needs_*`) or updated in the last 24 hours. At most 24 per world: active first, then the newest.
- **Where they stand.** Each station has rings of slots, centred on the side that faces the middle of the ground. Up to a cap stand there: 12 at home, 8 at work, 6 at intake and 6 at the gate. The gate fills longest-waiting first; the other stations fill in order of creation.
- **Piles.** Sessions past a station's cap go on a pile beside it: one disc per session, in its state colour. The focused session always stands; if it would be on the pile, it takes the last slot and that slot's session goes on the pile. A click on a pile focuses the next session in it, so repeated clicks go through every session on the pile, one at a time, and then start again.
- **Arrivals.** A session that appears after the island has loaded arrives as a carrier thrown by the commander, which lands on its slot after about 1.2 seconds and opens into the session's figure. Sessions that already exist when the island loads appear in place.
- **Moves.** When a session changes station, its figure walks to the new slot over about 0.8 seconds.

The canvas draws only on demand and asks for frames only while a carrier flies, a figure walks or the camera moves, so an island where nothing moves draws no frames. Nothing bobs or pulses.

## Worlds

A world is a group of projects. Each world is its own island with its own 24 figures; the rest of the island works the same in every world.

- **Rules file.** `<T3 home>/kore/worlds.json` (by default `~/.t3/kore/worlds.json`). The server reads it at `GET /api/kore/worlds` each time the island opens, so reopen the island to pick up an edit. [`worlds.sample.json`](worlds.sample.json) is an example.
- **Shape.** `{"version": 1, "worlds": [{"id", "name", "projects": [...], "paths": [...]}]}`. `projects` and `paths` may be left out.
- **Matching.** A project joins the first world in the file that matches it. A `projects` pattern matches the whole project title, ignoring case, with `*` as the only wildcard. A `paths` entry matches the project's workspace root and every folder below it, by whole path segments and with case; a trailing slash is ignored.
- **Unsorted.** Projects no world matches go to "Unsorted", listed last and only when it has sessions. A world with the id `unsorted` or `all`, or with an id already used above it, is skipped.
- **No file, or no worlds in it:** one world holding every session, with the theme's name ("KORE Atoll").
- **A file that cannot be read** (not JSON, the wrong version, a folder, or no answer from the server within 20 seconds): the same single world, and the panel shows the error line "The world rules could not be loaded: …".
- **Which world shows.** The one named in the URL (`?world=<id>`). Without one, the first world with a session waiting on the user, else the first world; once the sessions load, the page writes that choice into the URL, so a session starting or waiting elsewhere does not switch the world under you.

## The panel

The cards sit over the canvas: the panel down the right side, and left of it one column with the telemetry bar at the top, the camera dock at the bottom and the world rail in between. A card that wraps onto more rows pushes the others along the column rather than covering them. Only the cards take clicks; a click between them reaches the island.

- **Telemetry bar:** the shown world's name, then Working, Needs you, Sessions and Longest wait, counted across every world.
- **World rail:** one button per world with its working count, its waiting count and its longest wait. It shows when there is more than one world and the window is at least 1024 px wide; below that, the panel opens with a row of world buttons instead.
- **Camera dock:** the Overview, Station and Top buttons, and the keys.
- **Needs you:** sessions in the shown world waiting on the user, longest-waiting first. Choosing one focuses it.
- **Focused session:** its title, project and world, state and station, how long it has waited, when it started and last changed, "Approval denied from the island" after a deny, then its open request:
  - an approval shows the request's text with **Approve** and **Deny**. Deny takes an optional note when the agent accepts one. There is no "always allow".
  - a question shows its options as buttons, a text field when a typed answer is allowed, and several choices when the question allows them. A lone single-choice question is answered on the click.
  - a request that can no longer be answered live shows only **Open in console**.
- **Open in console** opens the session's own thread view.

Click a figure to focus it; the focused figure gets a ring in the theme's accent colour. The keys do nothing while typing in a field:

- **N** focuses the next session waiting on you, oldest first, in any world, switching to its world and wrapping round.
- **[** and **]** step to the previous and next world, wrapping round. Focus clears when the focused session is not in the new world.
- **1**, **2** and **3** pick the overview, station and top camera, the same as the dock's buttons.
- **Escape** clears focus.

The island answers the same request the thread view shows, through the same command. A request answered in either place disappears from both. The island opens a thread's detail stream only for the focused session, and only while it waits on the user.

A visually hidden list labelled "Island sessions" mirrors the shown world as text: one item per session figure with its title, state and station label, and one per carrier in flight. Each item carries `data-world-id`; a figure's item carries `data-session-key` and `data-state`, a carrier's `data-carrier-for`. After a deny from the island, the figure's item carries `data-last-decision="denied"` and its text ends ", last approval denied". Screen readers and tests read the island through it.

## Cameras

- **Overview:** the whole island from above one corner.
- **Station:** the station of the focused session, or the gate when nothing is focused, from the overview's direction but closer.
- **Top:** straight down on the island.

Each camera frames the island in the part of the canvas the cards leave free. A new camera, or a new station while on the station camera, eases over 0.6 seconds and asks for frames only while it moves; with reduced motion set, it jumps.

## Trying it without real sessions

`/island?feed=sim` shows about 40 made-up sessions in four worlds and Unsorted, with every state and every kind of request, under a "Simulated sessions" label. It makes no network request and no model call and never touches real sessions; answers change only the simulation, and **Open in console** does nothing. Sessions start, work, wait, finish and leave on their own, and new ones arrive as carriers. The world names and projects come back the same on every visit; the times follow the clock. Most requests wait until answered, but there is at most one that cannot be answered from the island, and it clears by itself after three minutes. Leaving out `feed=sim` goes back to the live island.

## Code layout

All island code is in `apps/web/src/kore/`, in four folders whose imports run one way:

- `core/`: plain TypeScript with no React, three.js or app imports. The contract types, the state and station mapping, the visibility rule, slot and pile layout, worlds and their matching, the denied mark, the next-waiting order, the snapshot diff and the simulator, with unit tests beside each file.
- `feed/`: the only code that knows T3. `useT3IslandFeed` turns thread shells, projects and the world rules into the contract's snapshot, reads the focused session's pending request, and answers it. `useSimulatedIslandFeed` serves the simulator in the same shape.
- `scene/`: the React Three Fiber scene. Imports `core/` only, plus React and three.js. Its role components are `Ground`, `StationShapes`, `CommanderFigure`, `KeeperFigures`, `SessionFigure`, `Carrier`, `Marker`, `StationStack` (a pile), `DeniedPost` and `Scenery` (decoration nothing reads); `SessionPiece` moves a session's carrier or figure to its slot, and `IslandCamera` drives the camera.
- `hud/`: the DOM cards, the text mirror and the keys. Imports `core/` only, plus React and the app's `components/ui`. `hud/insets.ts` holds how far the cards cover each edge of the canvas, which the camera frames around; change it with the cards' classes.

`IslandPage.tsx` picks the feed, wires it to the scene and the panel, keeps the shown world in the URL and times the carriers' flights. The route is `apps/web/src/routes/_chat.island.tsx`; it keeps `world` and `feed` in the URL.

## Themes

A theme is `scene/theme.ts` plus the role components in `scene/`. `currentTheme` holds what is not geometry: the world's name, the nouns for the figure and the carrier, each station's label, the palette (background, rim, accent, a figure colour per state, the marker colour and the scene's other colours) and the carrier and move durations. The panel and the hidden list take their words from it; `core/`, `feed/` and `hud/` contain nothing a new look changes.

### Current theme

An atoll on a deep-sea background (`#071621`): open sea (`#0F4C68`) on the square ground, then a ring of reef (`#B98A78`) and sand (`#E6DCC3`) round a calm lagoon (`#1F6F95`) in the middle. Every shape is a flat-coloured primitive.

- **Temple steps (home):** a small temple of pale stone with three steps, four columns and a pediment behind, on a gold band. The commander stands on the top step: a bearded god in a sea-green robe, on his own legs, holding a bronze trident.
- **Kelp shallows (intake):** a pool of shallow water with kelp stalks. Its keeper is a mermaid with a sea-glass tail and a woven basket.
- **Coral forge (work):** an anvil-shaped coral rock. Its keeper is a mermaid with a copper tail and a hammer.
- **Lighthouse (gate):** a short striped lighthouse on rocks, its lamp lit. Its keeper, a mermaid with a blue tail, waits at its foot with a lantern.

The three mermaids are told apart by tail and what they hold; each has long golden-blonde hair and a pale cloth bandeau. Sessions are upright seahorses, side on to the camera, in the state colours:

| State                                       | Colour                                                          |
| ------------------------------------------- | --------------------------------------------------------------- |
| `working`, `needs_approval`, `needs_answer` | gold `#D4AF37`                                                  |
| `starting`                                  | dim gold `#8C7728`                                              |
| `done`                                      | green `#10B981`                                                 |
| `idle`                                      | slate `#7D8A9C`                                                 |
| `stopped`                                   | slate, leaning back, with an iron band (`#4A5058`) at the waist |
| `failed`                                    | dark `#1F2329` with a red band                                  |

New sessions arrive as a clam sent from the commander's trident, which opens as it lands. A session that needs you has a red buoy (`#EF4444`) beside it. A session whose approval was denied from the island has a post of two crossed planks (`#7A3B2E`) beside it until it waits on a new request, starts again or leaves. The focus ring is gold.

The sea life is decoration and never moves: a sea turtle by the kelp shallows, an octopus on a rock by the coral forge, a seal on the lighthouse rocks, a small school of fish over the lagoon, three jellyfish in the open sea and a few starfish on the sand.

## Left out

- Token and cost counters, and sound.
- Moving the camera by hand: there are only the three cameras.
- Editing the world rules from the app: edit the file and reopen the island.
- Model files, textures and art: every shape is a three.js primitive with a flat colour.
- Attachments in question answers and dismissing a question; both remain in the thread view.
- Separate handling for subagent threads: each shows as its own figure.

## Checked

On 2026-11-17, in a dev build of the web client (data home the worktree's empty `.t3`), read as text: the hidden mirror, the panel, card sizes from `getBoundingClientRect`, and the console and network logs. How it was run is in [harness-notes.md](harness-notes.md#first-run-of-the-island-item-08-2026-11-17).

- **Simulated feed** (`/island?feed=sim`): no console errors. The label shows, the bar reads Working 19, Needs you 11, Sessions 38 across all worlds, the rail lists five worlds, and the page opens on Harbor Works, the first with something waiting, and writes `world=harbor-works` into the URL. The mirror lists 24 sessions for Harbor Works.
- **Focus and keys:** the "Needs you" list and **N** focus a session, and **N** moves across worlds; **[** and **]** step worlds and wrap; **1**, **2**, **3** and the dock's buttons change the pressed camera; **Escape** clears focus.
- **Requests:** an approval was approved, one denied with a note and one with no note field denied; a single-choice, a multiple-choice, a typed answer and the two-question request were each answered. Each session went back to working. After a deny the mirror item carries `data-last-decision="denied"` and the inspector shows "Approval denied from the island". The request that cannot be answered shows only **Open in console**, and in the next minutes one cleared by itself back to working.
- **Over time:** in about two minutes, 18 carriers (`data-carrier-for`) were listed for new sessions and 18 finished sessions left.
- **Layout:** at 1440, 1280 and 1024 px wide, with the app sidebar open, the bar, rail, dock and panel do not overlap. At 1024 px the bar and the dock wrap onto more rows, and the rail moves down below the bar. At 900 px the rail is hidden and the world row shows in the panel. A point between the cards hits the canvas.
- **Canvas:** one canvas with a WebGL2 context, not lost after switching cameras and worlds.
- **Live feed** (`/island`): no label; one world, "KORE Atoll", with `world=all` in the URL. A `Replay (dev)` thread ("Write approval", Supervised) waiting on its approval showed at the gate in "Needs you", was approved from the island, and went to done at home.
- **Worlds file:** with `worlds.sample.json` as the rules file, the rail lists Storefront, Acme, Tools and Unsorted, and both sessions are in Unsorted. With rules that match (a title pattern in other letter case, a path prefix with a trailing slash, plus a reserved and a repeated id), each session went to its world and the reserved and repeated ids were skipped. With a file cut off mid-JSON, the island shows one world and "The world rules could not be loaded: …", and the server's answer does not contain the file's text.

How the island looks was not watched, since no screenshots were taken: the figures, the piles, the stopped lean and band, the denied post, the camera framing and its eased moves, and the carriers' flight are **unverified**.

Before worlds, in a web client with the free `Replay (dev)` provider and with Claude Haiku 5.5 in Supervised mode. In both, a new session's carrier is listed, the session moves intake, work, gate, and the request is answered from the panel with one `runtime-request.respond`, after which it is gone from the thread view and the session returns home. With Claude, an approval was accepted (`decision: "accept"`, and the command ran) and another declined with a note (`decision: "decline"` with `feedback`, and the agent stopped without running it). A Replay question was answered from the panel. **N**, **Escape** and **Open in console** behave as described. These checks read the text mirror, the panel and the outgoing WebSocket requests; the animation itself has not been watched in a visible window (**unverified**).
