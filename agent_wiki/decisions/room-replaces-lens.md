---
type: Decision
title: '"Room" replaces "lens"'
description: Why the top-level axis of Lantern is called a room, and the cautions that come with the metaphor.
tags: [naming, rooms, concept]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
---

Decided 2026-09-27. Proposed by the user.

# Context

Lantern needs a top-level axis that reshapes the whole app depending on the kind of
cognitive work: learning, thinking, exploring, deciding. Prism has the same idea and calls
it a *lens*.

# Options

| Name | Verdict |
|---|---|
| **Room** | Chosen. |
| Lens | Rejected: in Prism a lens is a detected facet of a project, so the word already means something else there. |
| Shade, Gel, Hue | Rejected: suggest a tint only, but switching changes the whole space (AI role, node and edge meaning, UI). |
| Stance, Bearing | Rejected: describe the user's posture, not a place. |

# Decision

A **room** is a place built for one kind of cognitive work. You carry the lantern (your
subject and the AI) into a room. Each room is furnished differently (AI role, node and edge
meaning, UI) and has its own UI color, but the same lantern lights them all.

Rooms so far: Learn, Think, Explore, Decide, Discover. See the [overview](/architecture/lantern-overview.md).

# Consequences

1. A room is **not a container**. The subject belongs to the user and *visits* rooms, so on
   disk rooms go under the subject, never subjects under a room. Hold to this in the specs.
   The PoC only has one room and stores the graph directly on the subject, which is a
   shortcut (see [subject-on-disk-format](/issues/subject-on-disk-format.md)).
2. In multiplayer software "room" means a chat room. Revisit the word if collaboration ever
   comes.
3. Possible flavor names for the rooms, not decided: Library (Learn), Study (Think), Map room
   (Explore), Council room (Decide), Workshop.
