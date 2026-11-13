# The island

`/island` shows every recent session (a T3 thread) as a robot on one island, "KORE HQ". Where a robot stands and how it looks follow the session's real state, and a side panel answers the session's open approval or question in place. Open it from the command palette ("Open island") or at `/island`.

## Sessions and robots

A session's state comes from the thread list, without opening the thread. A pending approval wins, then a pending question, then the run status.

| Run status or request                     | State            | Station    | Robot                  |
| ----------------------------------------- | ---------------- | ---------- | ---------------------- |
| `preparing`, `queued`, `starting`         | `starting`       | crates     | dim gold               |
| `running`, `waiting`                      | `working`        | anvil      | gold                   |
| pending approval                          | `needs_approval` | watchtower | gold, with a red totem |
| pending question                          | `needs_answer`   | watchtower | gold, with a red totem |
| `idle`, or never run                      | `idle`           | command    | grey                   |
| `completed`                               | `done`           | command    | green                  |
| `interrupted`, `cancelled`, `rolled_back` | `stopped`        | command    | grey                   |
| `failed`                                  | `failed`         | command    | dark, with a red band  |

Stations are places a session stands by its state, not kinds of work: new work waits by the crates, running work stands at the anvil, work held for the user waits at the watchtower, and everything else reports back to the command dais. The red totem means "this session needs you" and nothing else.

- **Which sessions show.** Not archived, and either active (`starting`, `working`, `needs_*`) or updated in the last 24 hours. At most 24: active first, then the newest.
- **Where they stand.** Each station has rings of slots, filled in order of the sessions' creation and centred on the side that faces the island's middle.
- **Arrivals.** A session that appears after the island has loaded arrives as a barrel thrown from the commander on the dais, which lands on its slot after about 1.2 seconds and opens into the robot. Sessions that already exist when the island loads appear in place.
- **Moves.** When a session changes station, its robot walks to the new slot over about 0.8 seconds.

The canvas draws only on demand and asks for frames only while a barrel flies or a robot walks, so an island where nothing moves draws no frames. Nothing bobs or pulses.

## The panel

- **Header:** the island's name and how many sessions are working and waiting.
- **Needs you:** sessions waiting on the user, longest-waiting first. Choosing one focuses it.
- **Focused session:** its title, project, state and how long it has waited, then its open request:
  - an approval shows the request's text with **Approve** and **Deny**. Deny takes an optional note when the agent accepts one. There is no "always allow".
  - a question shows its options as buttons, a text field when a typed answer is allowed, and several choices when the question allows them. A lone single-choice question is answered on the click.
  - a request that can no longer be answered live shows only **Open in console**.
- **Open in console** opens the session's own thread view.

Click a robot to focus it; the focused robot gets a gold ring. **N** focuses the next session waiting on you (oldest first, wrapping round) and **Escape** clears focus. Neither fires while typing in a field.

The island answers the same request the thread view shows, through the same command. A request answered in either place disappears from both. The island opens a thread's detail stream only for the focused session, and only while it waits on the user.

A visually hidden list labelled "Island sessions" mirrors the scene as text: one item per robot with its title, state and station, and one per barrel in flight. Screen readers and tests read the island through it.

## Code layout

All island code is in `apps/web/src/kore/`, in four folders whose imports run one way:

- `core/`: plain TypeScript with no React, three.js or app imports. The contract types, the state and station mapping, the visibility rule, slot layout, the next-waiting order and the snapshot diff, with unit tests beside each file.
- `feed/`: the only code that knows T3. `useT3IslandFeed(focusKey)` turns thread shells and projects into the contract's snapshot, reads the focused session's pending request, and answers it.
- `scene/`: the React Three Fiber scene. Imports `core/` only, plus React and three.js.
- `hud/`: the DOM panel, the text mirror and the keys. Imports `core/` only, plus React and the app's `components/ui`.

`IslandPage.tsx` wires the feed to the scene and the panel and times the barrels' flights. The route is `apps/web/src/routes/_chat.island.tsx`.

## Left out

- More than one island, the rail of worlds, and grouping projects into worlds.
- Token and cost counters, a simulated feed, sound.
- Camera controls or presets: the view is fixed and fits the whole island.
- Model files and art: every shape is a box, cylinder, sphere or cone.
- Attachments in question answers and dismissing a question; both remain in the thread view.
- Separate handling for subagent threads: each shows as its own robot.

## Checked

Checked in a web client with the free `Replay (dev)` provider and with Claude Haiku 5.5 in Supervised mode. In both, a new session's barrel is listed, the session moves crates, anvil, watchtower, and the request is answered from the panel with one `runtime-request.respond`, after which it is gone from the thread view and the session returns to the dais. With Claude, an approval was accepted (`decision: "accept"`, and the command ran) and another declined with a note (`decision: "decline"` with `feedback`, and the agent stopped without running it). A Replay question was answered from the panel. **N**, **Escape** and **Open in console** behave as described. These checks read the text mirror, the panel and the outgoing WebSocket requests; the animation itself has not been watched in a visible window (**unverified**).
