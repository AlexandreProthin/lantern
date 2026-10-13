---
type: Decision
title: Welcome and Gallery belong to each room; no Home yet
description: Every room has its own Welcome and Gallery, the app reopens the room it was closed in, and an app-level Home waits until a need shows up.
tags: [rooms, spaces, navigation]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-12T00:00:00Z }
verified: { by: "human:alex", at: 2026-10-12T00:00:00Z }
---

Decided 2026-10-12 by the user, when a second room (Choose) was first planned. Closes the pending
question q-r2-spaces of [rooms-have-spaces](/decisions/rooms-have-spaces.md).

# Decision

- **Welcome and Gallery belong to each room**, as in Learn today. A room's Gallery lists that
  room's subjects.
- **No app-level Home.** If the need shows up later, a Home page that leads into a room may be
  added.
- **On launch the app shows the room it was in when it was closed** (RS-10, which already
  stores the last used room). Which space of that room opens is asked in workshop round 5
  (q-r5-open-space).

# Consequences

- The room chip in the header becomes the way to change room (RS-12 already plans it).
- The Rust side's per-subject summary, today read from the `learn` visit only, must become
  per room so each Gallery has its own stats.
