---
type: Issue
title: Subject on-disk format
description: "Open question: should a saved subject be an OKF bundle or a custom format?"
tags: [persistence, okf, open-question]
status: deprecated
generated: { by: claude-code/sonnet-5.5, at: 2026-10-01T21:45:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Resolved by [subject-single-json-file](/decisions/subject-single-json-file.md) and [subject-storage](/specs/subject-storage.md): one JSON file per subject.

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
