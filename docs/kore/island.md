# The island

`/island` shows every recent session (a T3 thread) as a figure on one island, "KORE Atoll". Where a figure stands and how it looks follow the session's real state, and a side panel answers the session's open approval or question in place. Open it from the command palette ("Open island") or at `/island`.

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

- **Which sessions show.** Not archived, and either active (`starting`, `working`, `needs_*`) or updated in the last 24 hours. At most 24: active first, then the newest.
- **Where they stand.** Each station has rings of slots, filled in order of the sessions' creation and centred on the side that faces the middle of the ground.
- **Arrivals.** A session that appears after the island has loaded arrives as a carrier thrown by the commander, which lands on its slot after about 1.2 seconds and opens into the session's figure. Sessions that already exist when the island loads appear in place.
- **Moves.** When a session changes station, its figure walks to the new slot over about 0.8 seconds.

The canvas draws only on demand and asks for frames only while a carrier flies or a figure walks, so an island where nothing moves draws no frames. Nothing bobs or pulses.

## The panel

- **Header:** the world's name and how many sessions are working and waiting.
- **Needs you:** sessions waiting on the user, longest-waiting first. Choosing one focuses it.
- **Focused session:** its title, project, state and how long it has waited, then its open request:
  - an approval shows the request's text with **Approve** and **Deny**. Deny takes an optional note when the agent accepts one. There is no "always allow".
  - a question shows its options as buttons, a text field when a typed answer is allowed, and several choices when the question allows them. A lone single-choice question is answered on the click.
  - a request that can no longer be answered live shows only **Open in console**.
- **Open in console** opens the session's own thread view.

Click a figure to focus it; the focused figure gets a ring in the theme's accent colour. **N** focuses the next session waiting on you (oldest first, wrapping round) and **Escape** clears focus. Neither fires while typing in a field.

The island answers the same request the thread view shows, through the same command. A request answered in either place disappears from both. The island opens a thread's detail stream only for the focused session, and only while it waits on the user.

A visually hidden list labelled "Island sessions" mirrors the scene as text: one item per session figure with its title, state and station label, and one per carrier in flight. Screen readers and tests read the island through it.

## Code layout

All island code is in `apps/web/src/kore/`, in four folders whose imports run one way:

- `core/`: plain TypeScript with no React, three.js or app imports. The contract types, the state and station mapping, the visibility rule, slot layout, the next-waiting order and the snapshot diff, with unit tests beside each file.
- `feed/`: the only code that knows T3. `useT3IslandFeed(focusKey)` turns thread shells and projects into the contract's snapshot, reads the focused session's pending request, and answers it.
- `scene/`: the React Three Fiber scene. Imports `core/` only, plus React and three.js. Its role components are `Ground`, `StationShapes`, `CommanderFigure`, `KeeperFigures`, `SessionFigure`, `Carrier`, `Marker` and `Scenery` (decoration nothing reads); `SessionPiece` moves a session's carrier or figure to its slot.
- `hud/`: the DOM panel, the text mirror and the keys. Imports `core/` only, plus React and the app's `components/ui`.

`IslandPage.tsx` wires the feed to the scene and the panel and times the carriers' flights. The route is `apps/web/src/routes/_chat.island.tsx`.

## Themes

A theme is `scene/theme.ts` plus the role components in `scene/`. `currentTheme` holds what is not geometry: the world's name, the nouns for the figure and the carrier, each station's label, the palette (background, rim, accent, a figure colour per state, the marker colour and the scene's other colours) and the carrier and move durations. The panel and the hidden list take their words from it; `core/`, `feed/` and `hud/` contain nothing a new look changes.

### Current theme

An atoll on a deep-sea background (`#071621`): open sea (`#0F4C68`) on the square ground, then a ring of reef (`#B98A78`) and sand (`#E6DCC3`) round a calm lagoon (`#1F6F95`) in the middle. Every shape is a flat-coloured primitive.

- **Temple steps (home):** a small temple of pale stone with three steps, four columns and a pediment behind, on a gold band. The commander stands on the top step: a bearded god in a sea-green robe, on his own legs, holding a bronze trident.
- **Kelp shallows (intake):** a pool of shallow water with kelp stalks. Its keeper is a mermaid with a sea-glass tail and a woven basket.
- **Coral forge (work):** an anvil-shaped coral rock. Its keeper is a mermaid with a copper tail and a hammer.
- **Lighthouse (gate):** a short striped lighthouse on rocks, its lamp lit. Its keeper, a mermaid with a blue tail, waits at its foot with a lantern.

The three mermaids are told apart by tail and what they hold; each has long golden-blonde hair and a pale cloth bandeau. Sessions are upright seahorses, side on to the camera, in the state colours:

| State                                       | Colour                         |
| ------------------------------------------- | ------------------------------ |
| `working`, `needs_approval`, `needs_answer` | gold `#D4AF37`                 |
| `starting`                                  | dim gold `#8C7728`             |
| `done`                                      | green `#10B981`                |
| `idle`, `stopped`                           | slate `#7D8A9C`                |
| `failed`                                    | dark `#1F2329` with a red band |

New sessions arrive as a clam sent from the commander's trident, which opens as it lands. A session that needs you has a red buoy (`#EF4444`) beside it. The focus ring is gold.

The sea life is decoration and never moves: a sea turtle by the kelp shallows, an octopus on a rock by the coral forge, a seal on the lighthouse rocks, a small school of fish over the lagoon, three jellyfish in the open sea and a few starfish on the sand.

## Left out

- More than one island, the rail of worlds, and grouping projects into worlds.
- Token and cost counters, a simulated feed, sound.
- Camera controls or presets: the view is fixed and fits the whole island.
- Model files, textures and art: every shape is a three.js primitive with a flat colour.
- Attachments in question answers and dismissing a question; both remain in the thread view.
- Separate handling for subagent threads: each shows as its own figure.

## Checked

Checked in a web client with the free `Replay (dev)` provider and with Claude Haiku 5.5 in Supervised mode. In both, a new session's carrier is listed, the session moves intake, work, gate, and the request is answered from the panel with one `runtime-request.respond`, after which it is gone from the thread view and the session returns home. With Claude, an approval was accepted (`decision: "accept"`, and the command ran) and another declined with a note (`decision: "decline"` with `feedback`, and the agent stopped without running it). A Replay question was answered from the panel. **N**, **Escape** and **Open in console** behave as described. These checks read the text mirror, the panel and the outgoing WebSocket requests; the animation itself has not been watched in a visible window (**unverified**).
