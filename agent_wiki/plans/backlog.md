---
type: Plan
title: Backlog
description: Agreed future work with no session or version assigned yet; each entry says where it starts and what it needs.
tags: [plan, backlog]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-06T22:30:00Z }
---

Entries move out of here into a versioned plan when the user schedules them. Newest first.

# Companion behaviour spec

- **Added:** 2026-10-06, on the user's request ("point 2 in a future session add it to the backlog").
- **What:** specify how the identity's companion behaves in the app. The release
  `lantern-identity-v0.2` gives it six finite gestures (rest, curiosity, a few steps, suspension,
  heat and lift, descent and landing) but defines no behaviour.
- **Open questions:** where it lives in each room and space; what triggers each gesture (only
  explicit user actions so far); how it is hidden and how it comes back (contract clause C09: always
  available, can be forgotten, never imposes itself); whether there is any idle animation (currently
  forbidden until agreed); how gestures chain from arbitrary states; calm during Learn (C10);
  reduced motion.
- **Inputs:** `agent_identity/projects/lantern/final/lantern-identity-v0.2/` (IDENTITY.md motion rules,
  IMPLEMENTATION.md runtime API), the identity contract `agent_identity/projects/lantern/CONTRACT-v2.md`,
  [rooms-spaces](/specs/rooms-spaces.md), [learn-room](/specs/learn-room.md).
- **How:** a spec workshop session (`agent_design/tool/specs_work/`), after the mark is live in the app
  ([v0.1.2](/plans/v0-1-2.md)).
- **Produces:** a new spec (likely `specs/companion.md`) and the deferred identity tests on idle and
  transition policy.
