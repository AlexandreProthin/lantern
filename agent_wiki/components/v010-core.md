---
type: Component
title: v0.1.0 core and storage
description: Room-independent domain contracts, persistence safety, and M1 validation evidence.
resource: /app/src/core/model.ts
tags: [core, storage, implementation, v0.1.0]
status: stable
generated: { by: Codex/GPT-6, at: 2026-10-02T15:25:00Z }
---

# Domain contract

The pure TypeScript core implements [domain-model](/specs/domain-model.md)
DM-1 to DM-55 and the shared [statistics](/specs/welcome-gallery.md) WG-30 to
WG-36. Room policy and generation coordination remain in the room module.

`parseSubject` validates untrusted JSON, including graph topology, state/provenance,
dialogue and generation records. Deleted node ids remain legal in the permanent log.
Graph operations refuse root deletion and preserve the log while deleting a subtree.
Repeated learner edits preserve the first model original; revert restores it.
Imported PoC provenance uses an explicit `unknown` author rather than inventing a model.

Statistics count every logged outcome, exclude dismissed nodes from progress, and
do not add thinking or cache tokens to input/output. Whole-number model shares use
largest remainder rounding so they total 100; zero-output logs have no shares.

# Evidence and remaining work

2026-10-02: seven focused domain tests passed (nine units including M0), covering
JSON round-trip, topology rejection, state transitions, duplicate titles, subtree
deletion, edit/revert and statistics. Storage and PoC import are the next M1 work;
M1 is not yet complete. See the [implementation plan](/plans/v0-1-0.md).
