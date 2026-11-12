---
type: Component
title: Prepared subjects, replay and collapse
description: How a prepared Learn subject is replayed instead of generated, which nodes the graph draws, dead ends, Replay from the start, collapsible branches kept in the app state, and collapsible solution blocks.
tags: [learn-room, replay, graph, markdown, storage]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-11-12T23:30:00Z }
resource: /app/src/core/visibility.ts
---

# Purpose

A Learn subject can arrive with its explanations already written (an LLM course made offline). Lighting
such a node replays its text instead of calling a model, and the graph shows the course as the learner
progresses. Why: [decision](/decisions/prepared-subjects-replay.md). Contracts: [learn-room](/specs/learn-room.md)
LR-90 to LR-115, [graph-view](/specs/graph-view.md) GV-120 to GV-136, [node-panel](/specs/node-panel.md) NP-64,
NP-71, NP-75 to NP-78, [domain-model](/specs/domain-model.md) DM-17a and DM-70 to DM-77. Built from the
[plan](/plans/prepared-subjects.md).

# Modules

| Module | For | Contract |
|--------|-----|----------|
| `app/src/core/visibility.ts` | Room-neutral projections | `shownIds(tree, opens)`: the root, then children of shown nodes that `opens` (GV-120); no rule shows all. `drawnIds` drops what a collapsed ancestor hides (GV-131); `hiddenCounts` gives each fold's *+n* (GV-133); `nearestShown` and `collapsedAncestors` keep the focus visible (GV-122, GV-134). Works on a thumbnail's projection too |
| `app/src/core/replay.ts` | Text streamer | `replayText(text, show, {durationMs, reduced, signal})` shows a growing prefix in about `REPLAY_STREAM_MS` (1 s, about 30 steps), never splitting a surrogate pair; `skip()` shows it whole; reduced motion is instant (LR-91, LR-93). `motionReduced()` reads the OS and the app override |
| `app/src/rooms/learn/rules.ts` | Learn's rules | `opensChildren`, `isPrepared` (open with content), `isDeadEnd` / `setDeadEnd` (`data.deadEnd: true` only), `resetProgress` (darkens lit and understood nodes, saves `data.progressSnapshot`, focus to the root) and `restoreProgress` (root down, raises only under a lit parent, never lowers, drops the snapshot). `validateLearn` checks both new fields |
| `app/src/rooms/learn/session.ts` | Replay in the session | `run('light'/'intro')` on a prepared node goes to `replay()`: `running` gets `replay: true` and `reveal` (stored children), no provider, no prompt, no record; the state becomes `lit` in one swap; a childless node that is not a dead end then runs `more`. `cancel()` on a replay skips (Esc, *Show all*, closing). `more` on a dead end is refused; a reply's `<branch>` is dropped there; `more` on the root gives axes |
| `app/src/rooms/learn/actions.ts` | Shared action list | Adds *Mark as dead end* / *Not a dead end* (any state but dismissed) and disables *More options* on a dead end with a tooltip (`MenuAction.title`) |
| `app/src/rooms/learn/SubjectMenu.svelte` | Field panel, Learn part | *Replay from the start…* with an inline confirmation (counts, the date of a snapshot it replaces) and *Restore progress* while a snapshot exists; both disabled while something runs |
| `app/src/ui/graph/Graph.svelte` | Shared graph | Computes `projection` (shown, drawn, hidden counts) per revision and hands the scene a visit of drawn nodes only, so layouts, keys, links and spawn see the same set. Collapse: node-menu items after a separator (root: *Collapse all* / *Expand all*), the GV-58 button, the *+n* badge, Right unfolds, focus and a starting generation unfold their way. Search takes `shown` and the room's `sealed` |
| `app/src/ui/graph/graph-scene.ts` | Spawn bodies | A replay grows `reveal` slots; any child that becomes drawn arrives in them, in creation order (GV-92a) |
| `app/src/frame/collapse-store.ts` | Fold persistence | `collapsed[subjectId]` in `state.json` through the `save_collapsed` command (desktop and paired devices), `localStorage` in the browser build; an empty list drops the entry, and deleting a subject drops it (GV-136) |
| `app/src-tauri/src/storage.rs` | `save_collapsed` | Validates the subject id and node ids, keeps the file's other keys, refuses a newer state format; `delete_subject` removes the subject's folds |
| `app/src/ui/markdown.ts` | `<details>` blocks | A block rule for `<details>` / `<details open>`, an optional `<summary>` line, and `</details>`, counting nesting and ignoring lines inside code fences; HTML stays off. Node links take a `linkable` predicate so a link to a hidden node is plain text (NP-71) |
| `app/src/ui/Markdown.svelte` | Rendering | Keeps which blocks are open per text for the session (NP-77), renders diagrams again when one opens, and styles blocks with the panel's tokens (NP-78) |

# Behaviours worth knowing

- A replay is a `running` entry like a generation, so every "busy" rule (disabled controls, undo refused,
  one at a time) applies for its second without any special case.
- The scene compares `before` with the drawn set, so stored children arriving through a replay look the
  same as generated ones.
- Header and Gallery counts still take every node of the file (WG-30): a fresh course shows its size.
- Choose's survey graph uses the same shared graph, so it has collapse too; with no `opens` it shows every node.

# Checks

Vitest: `core/visibility.test.ts` (visibility, collapse, streamer), `rooms/learn/prepared.test.ts` (each
replay row, dead ends, reset and restore, a 200-node course: full map form, under 12k tokens),
`ui/markdown.test.ts`, `graph-scene.test.ts`, `graph-search.test.ts`. Rust: `collapsed_nodes_are_kept_per_subject…`.
Playwright: `tests/prepared.spec.ts` (replay without a record, `<details>`, dead end and chained `more`,
collapse across a reload, reset and restore).
