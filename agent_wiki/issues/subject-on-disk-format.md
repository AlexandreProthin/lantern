---
type: Issue
title: Subject on-disk format
description: "Open question: should a saved subject be an OKF bundle or a custom format?"
tags: [persistence, okf, open-question]
status: draft
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
---

# Question

How should a subject live on disk? It should be readable and diffable. An **OKF bundle**
(markdown concepts with YAML frontmatter) would let Prism read subjects for free; a custom
format could carry the graph more directly.

# What we know

- The PoC uses one JSON blob per subject, see [subject-model](/components/subject-model.md).
  Fine for a PoC, opaque for humans and noisy in diffs.
- Rooms must go **under** the subject, never subjects under a room
  ([room-replaces-lens](/decisions/room-replaces-lens.md)).
- Node explanations and dialogue are markdown already, which suggests one file per node.

# To settle in the specs

Format, layout of rooms under a subject, and how edges beyond the tree are stored.
