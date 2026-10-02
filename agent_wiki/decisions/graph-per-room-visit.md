---
type: Decision
title: One graph per room visit
description: Each room a subject visits gets its own graph; a concept relevant in two rooms exists twice.
tags: [domain-model, rooms, graph]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-01T21:45:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Decided 2026-10-01. Decided with the user in the spec workshop, round 1.

# Context

A subject belongs to the user and visits rooms ([room-replaces-lens](/decisions/room-replaces-lens.md)).
The graph must be attached somewhere: to the subject, or to each room visit.

# Options

| Option | Verdict |
|---|---|
| A: one graph per room visit | Chosen. Each room defines its own node kinds, states and actions; nothing has to be shared. |
| B: one shared graph with a layer per room | Rejected: forces every room to agree on node semantics. |
| C: decide later | Rejected: the file format needs the answer now. |

# Decision

Library → Subject → RoomVisit → graph. A concept relevant in two rooms exists once per room.
v0.1.0 only has the `learn` room. See [domain-model](/specs/domain-model.md).

# Consequences

- Rooms are built into the app and never stored in the subject; only the visit data is.
- Cross-room links are not possible in v0.1.0. If wanted later, they are a new feature on top
  of this model.
