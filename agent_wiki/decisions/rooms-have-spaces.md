---
type: Decision
title: A room owns a set of spaces
description: Inside a room the user moves between spaces (Learn - welcome, learning space, gallery), mirroring Prism's lens and view.
tags: [rooms, spaces, ui]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-01T21:45:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Decided 2026-10-01. Decided with the user in the spec workshop, round 1.

# Context

Learn needs more than the graph: a place to start or continue a subject and a place to browse
explorations. The user proposed, by analogy with Prism (project, lens, view), a level below the
room: room, then space.

# Decision

- A room defines an ordered set of **spaces**; the UI frame shows the current room and space.
- Learn has three: **learning space** (graph and reading panel), **welcome** (start a subject
  or continue one of the 3 most recent), **gallery** (browse explorations with stats).
- Spaces are part of the Room definition, so a future room can have different ones.

# Pending

Whether welcome and gallery belong to each room or to the app level is open: q-r2-spaces. The
proposal is per room. See [learn-room](/specs/learn-room.md) and
[product-scope](/specs/product-scope.md).

# Consequences

"Room" stays a place and "space" is a part of that place; the header shows both (see
[product-scope](/specs/product-scope.md)).
