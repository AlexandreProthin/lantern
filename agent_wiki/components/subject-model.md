---
type: Component
title: Subject model and storage
description: The PoC's subject/node data model and how a subject is saved to disk.
tags: [subject, graph, persistence]
status: draft
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
resource: /poc/src/lib/subject.ts
---

# Model (format tag `lantern-poc/1`)

- `Subject`: `id` (slug of the title plus 4 random characters), `title`, `room: 'learn'`,
  `rootId`, `focusId`, `nodes` (a map by id), timestamps.
- `LNode`: `id`, `parentId` (the graph is a **tree** in the PoC), `title`, `hook`, `kind`,
  `state`, `content` (the tutor's explanation), `dialogue` (list of turns), `createdAt`.
- `state`: `open → lit → understood`. `kind`: `subject`, `axis`, `deeper`, `application`,
  `adjacent`, `exercise`, `question`.

# Storage

- One JSON file per subject in `Documents/Lantern/subjects/<id>.json`, written by the Rust
  commands in `poc/src-tauri/src/lib.rs`.
- Writes go to a `.json.tmp` file then rename, so a crash cannot leave a half-written subject.
- The subject id is checked (alphanumeric and `-` only) before it becomes a path.
- The front end saves 300 ms after each change (debounced).
- In a browser (no Tauri) the same calls fall back to `localStorage`, which is what
  `npm run dev` uses.

# Limits

Nodes have one parent, so no cross-links between concepts; the rooms and the on-disk format are
unresolved, see [subject-on-disk-format](/issues/subject-on-disk-format.md).
