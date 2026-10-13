---
type: Decision
title: lantern/2 makes the subject format room-neutral
description: v0.2.0 upgrades subject files to lantern/2 - neutral user/model roles, a data container for room-owned fields, free task names - and converts Learn files on first open.
tags: [storage, format, rooms, v0.2.0]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-12T23:00:00Z }
verified: { by: "human:alex", at: 2026-10-12T23:00:00Z }
---

Decided 2026-10-12 with the user (q-r6-format, flagged for discussion, settled in chat).

# Context

[graph-per-room-visit](/decisions/graph-per-room-visit.md) already gives each room its own graph,
but `lantern/1` carries Learn's vocabulary in the part every room shares: `createdBy` and the
dialogue `role` are `tutor | learner`, `understoodBy` is required on every node, the log's `task`
is Learn's five tasks, and `tone` is required on every visit. The user asked whether `lantern/1`
would limit later rooms and said converting old files is fine.

# Options

| Option | Verdict |
|---|---|
| Keep `lantern/1`, add Choose's fields alongside | Rejected: every future room (Think, Explore, Interview) would inherit Learn's words, and validation stays half core, half room. |
| `lantern/2` in the room-generic frame release | Chosen: the validators (TypeScript and Rust) are rewritten in that release anyway, and only one library has to be converted today. |

# Decision

- Roles become `user` and `model` (`createdBy`, dialogue `role`), matching `author.kind`.
- Nodes and room visits get a `data` object for room-owned fields, validated by the room
  (Learn: `understoodBy`, `tone`; Choose: needs answers, sources, Compare cells, subject status,
  needs card). The core part stays strict.
- The log's `task` is a string validated by the room; a record MAY count web calls.
- Learn files are converted on first open, forward only, with a backup (ST-31); an older app opens
  a `lantern/2` file read-only with a message (ST-30).
- Exact field list: [domain-model](/specs/domain-model.md) DM-4, written with the v0.2.0 plan.

# Consequences

PS-3 ("adding a room does not change the storage format") holds from `lantern/2` on. The
summary cache and the PoC import must produce `lantern/2`.
