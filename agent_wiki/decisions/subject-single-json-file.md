---
type: Decision
title: A subject is one JSON file
description: Each subject is stored as a single JSON file, not an OKF bundle or a folder of files; exports come later.
tags: [storage, persistence, format]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-01T21:45:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Decided 2026-10-01. Decided with the user in the spec workshop, round 1.

# Context

[subject-on-disk-format](/issues/subject-on-disk-format.md) asked whether a subject should be
an OKF bundle, a folder, or something custom. The PoC already stores one JSON blob per subject
([subject-model](/components/subject-model.md)).

# Options

| Option | Verdict |
|---|---|
| One JSON file per subject | Chosen. Atomic write, trivial to copy, one thing to lock and back up. |
| Folder with JSON plus one markdown file per node | Rejected: many files to keep consistent, partial writes, slower load. |
| OKF bundle | Rejected as the primary format; remains a candidate export. |

User: "one json file for now and probably forever; later export options e.g. OKF bundle".

# Decision

- One JSON file per subject, tagged `"format": "lantern/1"`.
- Other formats (an OKF bundle of the graph, markdown dumps) are **export** features, later.
- Layout, safety and migration rules: [subject-storage](/specs/subject-storage.md).

# Consequences

- The whole subject is rewritten on each save; this is acceptable at the scale target in the spec.
- Relations that another tool might want to rebuild live in the text of the nodes (see
  [domain-model](/specs/domain-model.md)), which keeps the file self-describing.
