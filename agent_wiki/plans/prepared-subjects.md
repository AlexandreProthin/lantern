---
type: Plan
title: Prepared subjects plan
description: Replay of prepared Learn content, visibility by progress, Replay from the start with Restore progress, dead ends, collapsible branches and collapsible solution blocks.
tags: [plan, learn-room, replay, graph, markdown]
status: draft
stale_after: 2027-02-28T00:00:00Z
generated: { by: claude-code/opus-5.5, at: 2026-11-12T12:00:00Z }
---

Written 2026-11-12 on branch `claude/prepared-subjects`. Waits for the user's review of the spec
amendments before any code. Why: [decision](/decisions/prepared-subjects-replay.md). Contracts:
[learn-room](/specs/learn-room.md) LR-39, LR-39a, LR-51a, LR-90 to LR-115;
[graph-view](/specs/graph-view.md) GV-26, GV-58, GV-92a, GV-120 to GV-136; [node-panel](/specs/node-panel.md)
NP-4, NP-10, NP-64, NP-71, NP-75 to NP-78; [domain-model](/specs/domain-model.md) DM-17a, DM-65, DM-70 to
DM-77; [context-assembly](/specs/context-assembly.md) CA-60 to CA-63; TP-36, TP-44, SE-50, WG-30, WG-40, RS-36.

# Steps

Each step ends green (Vitest, `cargo test`, svelte-check) and can land alone.

| # | Step | Where | Tests |
|---|---|---|---|
| 1 | **Collapsible blocks.** A markdown-it block rule for `<details>` / `<summary>` / `</details>` (HTML stays off), inline-rendered summary, nesting, unclosed = text; panel CSS; open state kept per node and text for the session; Mermaid on first open if needed. | `ui/markdown.ts`, `ui/Panel.svelte` | markdown unit tests: summary forms, nesting, math and code inside, unclosed, `<details onclick>` stays text, `List<T>` unchanged, sanitiser output |
| 2 | **Shared core.** `core/visibility.ts`: `shownIds(visit, opens)` and `drawnIds(shown, collapsed)`, `nearestShown`. `core/replay.ts`: a text streamer (duration, frame-batched chunks, `skip()`, abort, instant when reduced). | `core/` | unit: visibility over a 200-node fixture, focus fallback; streamer timing with fake timers, skip, reduced |
| 3 | **Learn rules.** `deadEnd` and `progressSnapshot` in `validateLearn`; `isPrepared`; `resetProgress` and `restoreProgress` (top-down, never lower, LR-39a); dead-end toggle; `<branch>` dropped on a dead end; `more` on the root forces `axis`. | `rooms/learn/rules.ts`, `session.ts` | rules: reset/restore round trip, restore after deletes and new nodes, invariant LR-39a, validation of bad snapshots |
| 4 | **Replay in the session.** `LearnSession.lightUp(id)` picks the LR-90 row; `replay(id)` sets `running` with `replay: true` (no provider, no prompt, no record), applies `lit` in one swap, then chains `more` when the row says so; `skip()`. Esc and the panel's *Show all* skip. Undo refuses during a replay like a generation. | `rooms/learn/session.ts`, `actions.ts`, panel | session: each LR-90 row with a fake provider (call count, log length), skip, delete during replay, undo steps |
| 5 | **Graph projection.** The shared graph draws `drawnIds` only: `GraphRoomView.opens` (Learn: lit/understood); `GraphScene` detects arrivals as newly shown nodes and sizes replay placeholders to the revealed children (GV-92a); `data-growing` keys on "shown after open"; search, keyboard and text links over shown nodes; open nodes match title and hook only. Thumbnail filters by GV-120. | `ui/graph/*`, `rooms/learn/Graph.svelte`, `Thumbnail.svelte` | scene: replay arrival with old `createdAt`; search ignores hidden and prepared text; keyboard over shown nodes |
| 6 | **Collapse.** Menu items after a separator (root: all), the GV-58 button, the +n badge, Right expands, auto-expand on focus and on a generation start, `collapsed` in `state.json` (prune, drop on delete), browser-storage twin. | `ui/graph/Graph.svelte`, `frame/` state, `library-spaces` | unit: drawn set, counts, prune; Graph test for root collapse and expand |
| 7 | **Dead-end UI.** The toggle in the shared action list, *More options* disabled with tooltip, the end cap glyph and legend row, the accessible name. | `rooms/learn/actions.ts`, `Graph.svelte`, strings | actions: list per state and dead end |
| 8 | **Replay from the start.** Subject menu entries, confirm dialog with counts and the snapshot date, *Restore progress*, focus to the root. | `rooms/learn/SubjectMenu.svelte` | component or session test; undo of each |
| 9 | **Provenance.** NP-4 fallback when no record matches (author's effort, no tokens). | `ui/Panel.svelte` | unit on the provenance line |
| 10 | **Real check.** A 200-node generated fixture (titles, hooks, `<details>`, links ahead, a dead end) opened in the dev app: first view, replays, chained `more` on the real provider once, reset/restore, collapse across a restart, pan/zoom at 60 fps, map form and `mapTokens` in the debug console. Then wiki: component pages, log. | `app/` fixtures, wiki | Playwright scenario for replay and reset in the browser build |

# What the authoring thread needs

[domain-model](/specs/domain-model.md) DM-70 to DM-77 is the checklist for the hand-written file: file
name = id, `lantern/2`, Learn only, `data.tone`, root `lit` to open on the axes, increasing sibling
`createdAt`, Learn kinds, `author` with any non-empty `generationId` (convention `authored-…`), hooks
under about 90 characters, explanations under 6,000 characters, solutions in `<details>`.

# Risks and points for the review

- **Older versions** show a prepared subject whole and would regenerate a prepared node. Accepted
  (format stays `lantern/2`); only this version should open it.
- **Counts over hidden nodes** (WG-30): chosen so a fresh course shows its size (*1 lit · 199 dark*).
  The alternative is counting shown nodes only, which needs Learn's rule in the Rust summary.
- **Esc during a replay skips** rather than cancels (LR-93): a 1-second free replay has nothing to
  cancel. Say if Esc should cancel instead.
- **Reset includes the root** (LR-110): the subject restarts on the root alone. Keeping the root lit
  would restart on the axes instead.
- **Restore never lowers a state and skips dismissed nodes** (LR-113), so progress made after the
  reset is kept.
- **Thumbnail**: the native projection reads the first 60 nodes breadth-first before the TypeScript
  filter, so a deep course may draw fewer than 60. Acceptable for now.
- The web demo's scripted tutor is untouched; it could later become a prepared subject.
