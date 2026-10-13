---
type: Spec
title: Domain model
description: The v0.1.0 data model - library, subject, room visit, tree graph, node fields, states, relations, generation log and invariants.
tags: [domain-model, graph, nodes, provenance]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-04T19:30:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Source: spec workshop rounds 1–3 (2026-10-01/02). Agreed with the user 2026-10-02 (q-r3-review).

Successor of the PoC model in [subject-model](/components/subject-model.md). Stored as in
[subject-storage](/specs/subject-storage.md).

# Hierarchy

Library (a folder) → Subject → RoomVisit (one per room the subject visited) → its own graph
([decision](/decisions/graph-per-room-visit.md)).

- **DM-1** A subject MUST hold a map of room visits keyed by room id; v0.1.0 only has `learn`. *(Amended 2026-10-12, round 5, for v0.2.0.)* From v0.2.0 a subject is created in one room and holds that room's visit only; the format keeps allowing several, which is Later (q-r5-cross-room). A room's Welcome, Gallery and recents list only the subjects that have its visit.
- **DM-2** Each room visit MUST own exactly one graph; a concept relevant in two rooms exists twice.
- **DM-4** *(Amended 2026-10-12, round 5, for v0.2.0.)* **The node core is shared; kinds, states and extra fields belong to the room** (q-r5-node-model). The core, validated for every room, is: `id`, `parents`, `title`, `hook`, `kind` (a string), `state` (a string), `content`, `author`, `previous`, `edited`, `dialogue`, `createdAt`, `createdBy`, the invariants DM-50 to DM-55 and the generation log's shape (DM-30, with `task` a string). The room definition validates the values of `kind`, `state`, `task` and its own extra fields (Learn: `understoodBy`; Choose: a need's answer, a rejected product's reason, sources). DM-12 to DM-15 and the dialogue roles of DM-18 are **Learn's** rules. Learn files stay valid as they are. **Format: `lantern/2`** ([decision](/decisions/format-lantern-2.md), q-r6-format), field list in DM-60 to DM-68.
- **DM-3** Rooms MUST be built into the app (a Room definition supplies the AI role and prompts, node kinds, states, actions, spaces, settings sections) and MUST NOT be stored in the subject.

# Node

- **DM-10** A node MUST have: `id` (short random, unique within the room visit), `parents: string[]`, `title`, `hook`, `kind`, `state`, `understoodBy`, `content` (markdown), `dialogue`, `createdAt`, `createdBy` (`tutor` | `learner`). Timestamps the app writes MUST strictly increase within a session (a write in the same millisecond moves 1 ms later), so siblings created by one reply keep their order; where `createdAt` ties anyway (older files), creation order is broken by `id`.
- **DM-11** The v0.1.0 graph is a **tree**. `parents` MUST hold exactly one id for every node except the root, where it is empty. The array form exists so that merge (several parents) can be added later without a format change ([decision](/decisions/merge-deferred.md)).
- **DM-12** `kind` MUST be one of: `subject`, `axis`, `deeper`, `application`, `adjacent`, `exercise`, `question`, `own` (added by the user). The `merge` kind is Later.
- **DM-13** `state` MUST be one of: `open`, `lit`, `understood`, `dismissed`. Normal flow is open → lit → understood.
- **DM-14** `understoodBy` MUST be `"demonstrated"` (tutor confirmed after a *Test me* check), `"self"` (learner declared) or `null`; it MUST be non-null exactly when `state` is `understood`.
- **DM-15** Only an `open` node MAY be dismissed. A dismissed node MUST be kept (faded) so the tutor never proposes it again, and MUST be restorable to `open`.
- **DM-16** Only **model-written text** keeps a previous version: the explanation (`content`, with `previous` on the node) and each tutor dialogue turn (`previous` on the turn). The first user edit stores the model's original in `previous`; later edits do not overwrite it, so revert always returns to the model's text. It is kept once (not a history). Title and hook edits keep nothing. Undo is Later.
- **DM-17** A node MUST have `author` for its content: `{kind: "model", model, effort, generationId}` or `{kind: "user", by}`. When the user edits it, the node MUST gain `edited: {by, at}`; `by` is the display name ([settings](/specs/settings.md)).
- **DM-18** `dialogue` MUST be a list of turns `{role: "learner" | "tutor", text, at, author}`. A tutor turn's `author` is `{kind: "model", model, generationId}`; a learner turn's is `{kind: "user", by}`. Only tutor turns are editable; a tutor turn edited by the user gains `edited: {by, at}` and `previous` (DM-16). **Learner turns are not editable** in v0.1.0.
- **DM-19** Editing title, hook, explanation or a dialogue turn MUST NOT trigger a generation. The tutor treats edited text as the learner's corrections, which take precedence ([tutor-protocol](/specs/tutor-protocol.md)).
- **DM-19a** Deleting a node MUST remove its whole subtree; the log keeps their records. The root MUST NOT be deletable; deleting a subject is done in Gallery.

# Relations

- **DM-20** `parents[]` MUST be the only structural edge; there MUST NOT be a separate edge list.
- **DM-21** Relations between nodes MUST live in the text as markdown links `[label](node:<id>)`, written by the tutor or the user. They are clickable in the panel and drawn as faint dotted lines in the graph, toggled from the legend. This lets another parser rebuild the graph from the text.
- **DM-22** A link to a node id that does not exist MUST render as plain text, not as an error. Deleting a node leaves such links as plain text.

# Generation log

Per room visit, one record per LLM call. Purpose: to know how many tokens it took for the graph to reach a given state.

- **DM-30** A record MUST hold: `id`, `nodeId`, `task` (`intro`|`light`|`reply`|`check`|`more`), `model`, `effort`, `tone`, `promptVersion`, `startedAt`, `durationMs`, `usage {input, output, thinking, cacheRead, cacheWrite}`, `costUsd?` (API-equivalent, stored, not shown) and `outcome` (`ok`|`cancelled`|`error`). The `merge` task is Later. `suggest` (*Suggest 3 subjects* on Welcome) runs before a subject exists, so there is no room visit to hold its record: it is **not logged** in v0.1.0 and is not a value of `task`.
- **DM-33** `model` MUST be the resolved model id reported by the provider (e.g. `claude-sonnet-5-5`), not the alias the user picked, and `effort` the level passed to the provider ([inference-provider](/specs/inference-provider.md), IP-6).
- **DM-31** Totals MUST be derived from the log, never stored a second time.
- **DM-32** Cancelled and failed calls MUST still be logged and marked, with whatever usage is known (often none for a cancel).
- **DM-34** Records are kept forever: about 300 bytes each, so 2,000 calls come to about 600 KB.
- **DM-35** The UI shows tokens and time, never currency, and all usage numbers can be hidden by a setting. The node meta line reads like *Sonnet 5.5 · medium · 3.2k in / 1.1k out · 24 s*.

# Settings in the visit

- **DM-41** *(v0.1.1)* A room visit MAY hold `direction`: the learner's free text on where the subject should start, head, or what to skip, at most 500 characters, line breaks allowed ([welcome-gallery](/specs/welcome-gallery.md) WG-9). Absent and `""` both mean no direction, so v0.1.0 files need no migration and the format stays `lantern/1`. Like tone, it is set when the subject is created, changed in the subject menu for future generations only ([rooms-spaces](/specs/rooms-spaces.md) RS-19), and sent with every generation ([context-assembly](/specs/context-assembly.md) CA-37). The generation log does not copy the text; `promptVersion` tells whether the prompts could carry it.
- **DM-40** A room visit MUST hold `tone`, `model` and `effort` (set per subject, defaulted from app settings, changeable at any time for future generations only) and `focusId`, the node in view. Each generation logs the tone, model and effort it used.

# Invariants

- **DM-50** Each room visit MUST have exactly one root.
- **DM-51** Every id in `parents` MUST reference an existing node of the same room visit.
- **DM-52** The graph MUST have no cycles.
- **DM-53** ~~A merge node's parents MUST NOT be ancestors of one another.~~ Withdrawn: merge is Later. (When merge returns, this rule returns with it.)
- **DM-54** Node ids MUST be unique within the room visit.
- **DM-55** In v0.1.0 every non-root node MUST have `parents.length == 1` (DM-11).

# lantern/2 (v0.2.0)

*(Added 2026-10-13, v0.2.0 plan step A1; [decision](/decisions/format-lantern-2.md).)* `lantern/2`
keeps the shape of `lantern/1` (subject → room visits → nodes and log) and moves every room-owned
field into a `data` object. Rules DM-1 to DM-55 still hold, read with the changes below.

- **DM-60** The **subject** is unchanged except `"format": "lantern/2"`: `format`, `id`, `title`,
  `createdAt`, `rooms`.
- **DM-61** A **room visit** has these core fields: `rootId`, `focusId`, `model`, `effort`, `nodes`,
  `log`, and `data` (an object owned by the room; absent means `{}`).
- **DM-62** A **node** has these core fields: `id`, `parents`, `title`, `hook`, `kind`, `state`,
  `content`, `author` (required when `content` is not empty), `previous?`, `edited?`, `dialogue`,
  `createdAt`, `createdBy`, and `data` (absent means `{}`). `kind` and `state` are non-empty
  strings whose values the room defines.
- **DM-63** **Roles are neutral**: `createdBy` is `user` or `model`; a dialogue turn's `role` is
  `user` or `model`. A turn is `{role, text, at, author, previous?, edited?}`; a `user` turn has a
  `user` author and is not editable (no `previous`, no `edited`); a `model` turn has a `model`
  author. These rules, formerly DM-18 for Learn, now hold for every room.
- **DM-64** A **generation record** has these core fields: `id`, `nodeId`, `task` (a non-empty
  string whose values the room defines), `model`, `effort`, `promptVersion`, `startedAt`,
  `durationMs`, `usage {input, output, thinking, cacheRead, cacheWrite}`, `costUsd?`, `outcome`,
  `toolCalls?` (a count per tool name, for example `{"WebSearch": 3}`; absent means none), and
  `data` (absent means `{}`).
- **DM-65** **Learn's `data`**:

| Where | Field | Rule |
|---|---|---|
| visit | `tone` | required; a preset or `{custom}` of at most 300 characters (DM-40) |
| visit | `direction` | optional; at most 500 characters; absent or `""` is none (DM-41) |
| node | `understoodBy` | `"demonstrated"` or `"self"`, present exactly when `state` is `understood` (DM-14); absent otherwise |
| record | `tone` | required; the tone the call used (DM-30, LR-19) |

  Learn's `kind`, `state` and `task` values are those of DM-12, DM-13 and DM-30.
- **DM-66** **Validation is split.** The core (DM-60 to DM-64 and the invariants DM-50 to DM-55) is checked
  by the Rust storage layer before every write and on every read (structure, ids, parents, roles,
  required fields), and in full by TypeScript, which also checks the authors of DM-17. The room's values (`kind`, `state`, `task` and everything in `data`) are
  checked by the room definition in TypeScript, on load and before every save; the Rust layer knows
  no room. A visit whose room id the app does not know is validated as core only, kept untouched
  on save, and shown in no room.
- **DM-67** Unknown fields outside `data` MUST be kept on save, so a newer minor version's additions
  survive a round trip.
- **DM-68** **Conversion from `lantern/1`** is mechanical: `format` becomes `lantern/2`; in each visit
  `tone` and `direction` move to `data`; in each node `understoodBy` moves to `data` when not null
  and is dropped when null, and `createdBy` `learner`/`tutor` become `user`/`model`; each turn's
  `role` likewise; in each record `tone` moves to `data`. Every other field, unknown ones included,
  is copied unchanged. When and how it runs: [subject-storage](/specs/subject-storage.md) ST-32.

# Example (lantern/2)

The `lantern/1` example below, converted:

```json
{
  "format": "lantern/2",
  "id": "tides-k3f9",
  "title": "Tides",
  "createdAt": "2026-10-01T20:00:00Z",
  "rooms": {
    "learn": {
      "model": "sonnet",
      "effort": "medium",
      "focusId": "n2",
      "rootId": "n1",
      "data": { "tone": "engineer", "direction": "Start from the Moon, skip the history." },
      "nodes": {
        "n1": {
          "id": "n1", "parents": [], "title": "Tides", "hook": "Why the sea breathes",
          "kind": "subject", "state": "lit",
          "content": "Tides come from... see [the Moon](node:n2).",
          "author": { "kind": "model", "model": "claude-sonnet-5-5", "effort": "medium", "generationId": "g1" },
          "dialogue": [
            { "role": "user", "text": "Why two tides a day?", "at": "2026-10-01T20:02:00Z",
              "author": { "kind": "user", "by": "alex" } }
          ],
          "createdAt": "2026-10-01T20:00:05Z", "createdBy": "model"
        },
        "n2": {
          "id": "n2", "parents": ["n1"], "title": "The Moon's pull", "hook": "Gravity gradient",
          "kind": "deeper", "state": "open",
          "content": "", "dialogue": [], "createdAt": "2026-10-01T20:00:41Z", "createdBy": "model"
        }
      },
      "log": [
        { "id": "g1", "nodeId": "n1", "task": "intro", "model": "claude-sonnet-5-5", "effort": "medium",
          "promptVersion": "learn-3", "startedAt": "2026-10-01T20:00:00Z", "durationMs": 12400,
          "usage": { "input": 1800, "output": 640, "thinking": 120, "cacheRead": 0, "cacheWrite": 13000 },
          "costUsd": 0.021, "outcome": "ok", "data": { "tone": "engineer" } }
      ]
    }
  }
}
```

# Example (lantern/1)

The values are illustrative (this example uses a sonnet model); the app's default model is `opus` ([settings](/specs/settings.md)).

```json
{
  "format": "lantern/1",
  "id": "tides-k3f9",
  "title": "Tides",
  "createdAt": "2026-10-01T20:00:00Z",
  "rooms": {
    "learn": {
      "tone": "engineer",
      "direction": "Start from the Moon, skip the history.",
      "model": "sonnet",
      "effort": "medium",
      "focusId": "n2",
      "rootId": "n1",
      "nodes": {
        "n1": {
          "id": "n1", "parents": [], "title": "Tides", "hook": "Why the sea breathes",
          "kind": "subject", "state": "lit", "understoodBy": null,
          "content": "Tides come from... see [the Moon](node:n2).",
          "author": { "kind": "model", "model": "claude-sonnet-5-5", "effort": "medium", "generationId": "g1" },
          "dialogue": [
            { "role": "learner", "text": "Why two tides a day?", "at": "2026-10-01T20:02:00Z",
              "author": { "kind": "user", "by": "alex" } }
          ],
          "createdAt": "2026-10-01T20:00:05Z", "createdBy": "tutor"
        },
        "n2": {
          "id": "n2", "parents": ["n1"], "title": "The Moon's pull", "hook": "Gravity gradient",
          "kind": "deeper", "state": "open", "understoodBy": null,
          "content": "", "dialogue": [], "createdAt": "2026-10-01T20:00:41Z", "createdBy": "tutor"
        }
      },
      "log": [
        { "id": "g1", "nodeId": "n1", "task": "intro", "model": "claude-sonnet-5-5", "effort": "medium", "tone": "engineer",
          "promptVersion": "learn-3", "startedAt": "2026-10-01T20:00:00Z", "durationMs": 12400,
          "usage": { "input": 1800, "output": 640, "thinking": 120, "cacheRead": 0, "cacheWrite": 13000 },
          "costUsd": 0.021, "outcome": "ok" }
      ]
    }
  }
}
```

# Open

None for v0.1.0. For v0.2.0: Choose's `data` fields (v0.2.0 plan step B2).

Related: [subject-storage](/specs/subject-storage.md), [learn-room](/specs/learn-room.md), [tutor-protocol](/specs/tutor-protocol.md), [inference-provider](/specs/inference-provider.md), [settings](/specs/settings.md).
