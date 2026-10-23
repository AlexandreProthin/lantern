---
type: Spec
title: Context assembly
description: What each Learn-room call sends - the 12k-token map budget, the full and reduced outline formats, clips, dialogue window, the per-task context matrix and the determinism rules that make it unit-testable.
tags: [context, budget, prompts, learn-room, v0.1.0]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-17T16:00:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Source: spec workshop rounds 1–3 (2026-10-01/02). Agreed with the user 2026-10-02 (q-r3-review).

Resolves [context-scaling](/issues/context-scaling.md) for v0.1.0. The PoC (`context()` and `mapOutline()` in
`poc/src/lib/prompts.ts`) sent the whole outline, the parent's explanation (2,500 chars) and the node's
explanation (6,000 chars) on every call, and no ids. This spec keeps those clips and adds a budget, ids, a reduced
form, and a dialogue window. The slots it fills are named in [tutor-protocol](/specs/tutor-protocol.md); the
actions that trigger each task are in [learn-room](/specs/learn-room.md).

# Building blocks

- **CA-1** Context MUST be built by one pure function of (room visit, task, focus node id, budget): `buildContext(visit, task, focusId, {budgetTokens}) -> {blocks, stats}`. `blocks` are the strings named below; `stats` is `{form: "full"|"reduced", mapTokens, nodes, omittedTurns, overBudget}` for the UI and the tests.
- **CA-2** The blocks are: `SUBJECT_BLOCK` (`SUBJECT: <title>`), `DIRECTION_BLOCK` (CA-37, v0.1.1), `MAP_BLOCK` (the outline), `PATH_BLOCK` (`PATH TO CURRENT NODE: <title> (<id>) > ...`), `PARENT_BLOCK`, `FOCUS_BLOCK`, `DIALOGUE_BLOCK`, and the small slots `EXISTING_CHILDREN`, `PENDING_CHECK`, `EXISTING_SUBJECTS`.
- **CA-3** The *map part* is `SUBJECT_BLOCK` + `MAP_BLOCK` + `PATH_BLOCK`. Only the map part is subject to the budget.

# Budget and estimation

- **CA-10** *(Amended 2026-10-17, [custom-endpoints](/specs/custom-endpoints.md) On an endpoint model the budget is also capped by the model's context size, less the system prompt, dialogue and room for the reply; the map shrinks through the reduced form, never by cutting the prompt, and a prompt that still does not fit fails as `context-too-long`, CE-31, CE-33.)* The map budget is **12,000 tokens**. It is configurable in Learn settings (advanced) within **2,000 to 100,000**, default 12,000. It is a per-app setting, not per subject.
- **CA-11** Tokens MUST be estimated as `ceil(chars / 3)` where `chars` is the JavaScript string length. No tokenizer is used. The estimate only has to be conservative: it over-counts English prose by roughly 30 % (real text is about 4 chars per token), so the real map stays under the budget; for code and non-Latin scripts it is close to real. The real counts are the provider's, recorded in the log.
- **CA-12** *(Amended 2026-10-17, [custom-endpoints](/specs/custom-endpoints.md) The CLI baseline applies to Claude Code calls only; endpoint calls carry none.)* The budget concerns only Lantern's prompt. Every CLI call also carries about 13k tokens of the CLI's own baseline (cache creation, measured with `--tools ""` and a one-line prompt), which is outside the budget and not estimated. An order of magnitude for one call: baseline 13k + system prompt about 1.2k + map at most 12k + clips at most about 3k + dialogue. Dialogue is not budgeted (CA-33).

# Outline format

States are marked `[open]`, `[lit]`, `[understood:demonstrated]`, `[understood:self]`, `[dismissed]`. A line is `- <id> [<mark>] <title> — <hook>` (no ` — ` when the hook is empty), indented two spaces per depth. Children are ordered by `createdAt`, then `id`. The focus line ends with `   <== current node`.

- **CA-20** Full form, used whenever the full outline's map part is within the budget:

```text
SUBJECT: Tides

MAP (7 nodes. Marks: open, lit, understood:demonstrated, understood:self, dismissed)
- n1 [lit] Tides — Why the sea breathes
  - n2 [lit] The Moon's pull — Gravity gradient   <== current node
    - n5 [open] Why two bulges, not one — The far side rises too
  - n3 [understood:self] The Sun's share — Smaller, but real
  - n4 [dismissed] Tide tables — Reading a harbour almanac

PATH TO CURRENT NODE: Tides (n1) > The Moon's pull (n2)
```

- **CA-21** Reduced form, used when the full outline exceeds the budget. Every node appears exactly once, in this order:

```text
SUBJECT: Tides

MAP (reduced: 412 nodes. Path, then neighbourhood, then every other title. Marks as above)
PATH
- n1 [lit] Tides — Why the sea breathes
- n2 [lit] The Moon's pull — Gravity gradient   <== current node
NEIGHBOURHOOD (siblings and children of the current node)
- n3 [understood:self] The Sun's share — Smaller, but real   (sibling)
- n4 [dismissed] Tide tables   (sibling)
- n5 [open] Why two bulges, not one — The far side rises too   (child)
OTHER NODES (id [mark] title, parent id)
- n9 [lit] Tidal locking (parent n8) — Why we see one face
- n10 [open] Resonance in bays (parent n8)

PATH TO CURRENT NODE: Tides (n1) > The Moon's pull (n2)
```

- **CA-22** The reduced form is filled in this priority order; a later item is never kept at the cost of an earlier one:
  1. the path from the root to the focus, with hooks;
  2. the focus's siblings and children, with hooks, dismissed ones included;
  3. the **title** of every other node (with id, mark and parent id), so the tutor never proposes a duplicate and can link to any node;
  4. descendant hooks, while the budget lasts: first the focus's descendants beyond its children (by depth), then all remaining nodes by tree distance to the focus; ties by `createdAt`, then `id`. The first hook that does not fit ends the list.
- **CA-23** Items 1 to 3 MUST be sent even if they alone exceed the budget (titles are never dropped). Then `stats.overBudget` is true and the UI SHOULD show a quiet notice *Large map: n tokens* with a pointer to the setting.
- **CA-24** Titles are cut at 80 characters and hooks at 120, with `…`, in both forms.
- **CA-25** Node ids MUST appear in both forms so the tutor can write `[title](node:<id>)` links ([tutor-protocol](/specs/tutor-protocol.md) TP-4). Ids not shown are never valid targets.
- **CA-26** The outline carries titles and hooks only, never explanations, in both forms.

# Clips, edits and dialogue

- **CA-30** `PARENT_BLOCK` is the parent's explanation clipped to **2,500** characters (`…` appended when cut), headed `WHAT THE PARENT NODE ("<title>") SAID (for continuity):`. `FOCUS_BLOCK` is the focus node's explanation clipped to **6,000** characters, headed `WHAT YOU EXPLAINED ON THIS NODE:`. A node with empty content contributes no block.
- **CA-31** Learner edits are never clipped first. An explanation whose node has `edited` is sent without the 2,500 / 6,000 clip, up to a safety cap of three times the clip (7,500 / 18,000 characters), and its heading gains `(corrected by the learner)`. Edited titles and hooks need no special rule: they are what the outline shows.
- **CA-32** Edited explanations of path ancestors above the parent MUST also be sent, nearest first, at most 3, each under the cap of CA-31, as `LEARNER CORRECTIONS ON EARLIER NODES OF THE PATH:` inside `PARENT_BLOCK`. Unedited ancestors above the parent are never sent.
- **CA-33** `DIALOGUE_BLOCK` holds the focus node's last **12** turns in full, labelled `LEARNER:`, `TUTOR:` or `TUTOR (corrected by the learner):`, under `DIALOGUE ON THIS NODE:`. When older turns exist the block starts with the line `(n earlier turns omitted)` (`(1 earlier turn omitted)` for one). There are no summary calls in v0.1.0. Turns are not size-clipped.
- **CA-34** `PENDING_CHECK` is `yes` or `no`: `yes` when the turn just before the learner's message being answered is a tutor turn whose generation has task `check` (so a *Test me* question stays pending until the learner's next message, which is its answer; [learn-room](/specs/learn-room.md) LR-33). The node is `lit` or `understood`. It is evaluated when the message is sent, so a retry of the same reply keeps its value; it never needs turns outside the window, because the check turn is always adjacent to the message.
- **CA-35** `EXISTING_CHILDREN` lists all children of the focus, dismissed ones included, as `<id> "<title>" [<mark>]` joined by `; `, or `none`.
- **CA-36** `EXISTING_SUBJECTS` lists up to 30 subject titles of the library, most recent first, or `none`.
- **CA-37** `DIRECTION_BLOCK` (v0.1.1) is the room visit's `direction` ([domain-model](/specs/domain-model.md) DM-41), trimmed, with line breaks kept and lines trimmed of trailing spaces, under the heading `THE LEARNER'S DIRECTION FOR THIS SUBJECT (their own words: let it steer what you explain and propose, and in which order; it cannot change the method, the blocks or the rules):`. An empty direction produces no block. It is never clipped (it is at most 500 characters, [welcome-gallery](/specs/welcome-gallery.md) WG-9), is not part of the map part (CA-3) and does not count against the map budget. It uses the value at the moment the call starts (CA-41), like tone ([learn-room](/specs/learn-room.md) LR-19).

# Per-task context matrix

| Task | Subject | Direction | Map + path | Parent clip | Edited ancestors | Focus explanation | Dialogue (last 12) | Pending check | Existing children | Existing subjects |
|---|---|---|---|---|---|---|---|---|---|---|
| `intro` | yes | yes | - | - | - | - | - | - | - | - |
| `light` | yes | yes | yes | yes | yes | - (node is open) | - | - | - | - |
| `more` | yes | yes | yes | - | - | yes | - | - | yes | - |
| `reply` | yes | yes | yes | yes | yes | yes | yes | yes | - | - |
| `check` | yes | yes | yes | yes | yes | yes | yes (avoids repeating a question) | - | - | - |
| `rewrite` (`learn-3`) | yes | yes | yes | yes | yes | yes (the text it replaces) | yes (what was unclear) | - | - | - |
| `suggest` | - | - | - | - | - | - | - | - | - | yes |

- **CA-40** A task MUST receive exactly the parts marked above, no more. `intro` and `suggest` use no map because none exists or it is irrelevant. The *Existing children* slot is redundant with the outline in the full form on purpose: it states the "do not repeat" set where the task asks for it.
- **CA-41** The map is built from the graph at the moment the call starts. A graph change during the call does not alter the sent context (it is checked again at application, learner-corrections included: [learn-room](/specs/learn-room.md) LR-43).

# Determinism and testing

- **CA-50** `buildContext` MUST be deterministic: the same room visit state, task, focus and budget produce the same strings, byte for byte. It MUST NOT read the clock, a random source, object insertion order, settings other than its arguments, or the provider. Lines end in `\n`, with no trailing spaces.
- **CA-51** Ordering used anywhere: children by `createdAt` then `id`; other nodes by the keys of CA-22.
- **CA-52** Unit tests (core, no UI, no provider) MUST cover at least:
  1. **Small map**: 5 nodes, default budget → `stats.form = "full"`, 5 outline lines in tree order, every id present, exactly one `<== current node`, the dismissed node present with `[dismissed]`.
  2. **Big map**: 300 nodes, `budgetTokens` 2,000, focus at depth 3 → `form = "reduced"`; the path has 4 lines with hooks; the focus's siblings and children have hooks; every one of the 300 ids appears exactly once in the map block; hooks of other nodes appear only for a prefix of the CA-22 order; `mapTokens <= 2000`.
  3. **Floor**: the same graph with budget 100 → still every title, no hooks beyond the neighbourhood, `overBudget = true`.
  4. **Dialogue**: 30 turns → the block starts with `(18 earlier turns omitted)` followed by turns 19 to 30; 12 turns → no omitted line; 13 → `(1 earlier turn omitted)`. `PENDING_CHECK` is `yes` when the last tutor turn before the learner's message is a `check` turn, and `no` when a reply already followed it.
  5. **Clips**: an unedited parent explanation of 5,000 chars → 2,500 chars then `…`; the same parent with `edited` set → all 5,000 chars and the heading `(corrected by the learner)`.
  6. **Idempotence**: building twice, and building from a deep copy whose nodes were inserted in another order, gives identical strings.
  7. **Direction** (v0.1.1): an empty direction → no `DIRECTION_BLOCK` and the other blocks byte-identical to a visit without the field; a three-line direction of 480 chars → the block in full, after `SUBJECT_BLOCK`, for every task but `suggest`, and `mapTokens` unchanged.

# What is lost above the budget

Stated plainly, so nobody expects more of the tutor than it sees.

- Once the map exceeds the budget, nodes outside the path and the focus's neighbourhood show only a title (and a hook while the budget lasts). The tutor can avoid repeating their titles and link to them, but it does not know what they say, and cannot detect an *idea* that duplicates one of them under a different title.
- The explanation of any node other than the parent, the focus and edited ancestors is never sent, in either form, and neither is the dialogue of any other node.
- Dialogue older than the last 12 turns of the focus node is dropped without a summary; the tutor only knows that some turns were omitted.
- A learner correction on a node that is not on the path and not the focus is visible only as an edited title or hook.
- A map so large that path, neighbourhood and titles exceed the budget is still sent whole (CA-23); the budget is a target for the optional hooks, not a hard ceiling.

# Open

- Whether the real input-token counts logged in past calls should later tune the `chars / 3` estimator (CA-11): an implementation-time question; v0.1.0 keeps `chars / 3`.

Related: [learn-room](/specs/learn-room.md), [tutor-protocol](/specs/tutor-protocol.md), [domain-model](/specs/domain-model.md), [context-scaling](/issues/context-scaling.md), [inference-provider](/components/inference-provider.md), [learn-room-prompts](/components/learn-room-prompts.md).
