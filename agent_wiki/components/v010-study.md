---
type: Component
title: v0.1.0 Frame and Study
description: Room-contributed Study UI, graph and node panel, rendering, settings foundations and browser evidence.
resource: /app/src/frame/Shell.svelte
tags: [implementation, frame, study, graph, panel, settings]
status: draft
generated: { by: Codex/GPT-6, at: 2026-10-02T16:35:00Z }
---

# Implemented slice

The Frame consumes the [room interface](/specs/rooms-spaces.md), keeps subject
controllers alive across space switches, flushes writes on close and displays
reload/conflict/save-failure notices. Welcome and Gallery remain D1 stubs.

Study ports the accepted learning-node recipe and PoC travelling-light effect.
It adds the lantern/1 graph, deterministic shared tree layout, keyboard navigation,
self-declared and dismissed states, zoom/recenter, a persistent split and legend.
Collapsed panes stay mounted, preserving the graph transform and panel drafts.
Layout and reduced-motion overrides use app settings.

The panel supports the fake-tutor loop, streamed text, cancellation, checks,
dismiss/restore, own nodes, selection actions, subtree deletion, learner edits and
previous-version comparison/revert. Markdown uses sanitized MarkdownIt output,
KaTeX, code highlighting/copy and lazy Mermaid rendering after streaming ends.

Settings foundations provide versioned atomic backend storage, unknown-key
preservation, corruption recovery, debounced writes, room-contributed controls
and an explicit tiny provider test. External links use a scheme-checked system
adapter. The summary cache filename is `summaries.json` (SE-51).

# Evidence and remaining gates

- Type check: zero errors and warnings; 28 TypeScript tests pass.
- Three Playwright tests pass: startup stub; fake Study loop with edits,
  dismiss/restore and restart persistence; cancellation with its retained log.
- Eleven Rust tests pass; real CLI and the idle benchmark are explicit opt-in gates.
- Idle ST-50 five-sample medians: save 63.24 ms, load 25.47 ms for 500 nodes;
  both meet the unchanged 100/200 ms thresholds.

M3 is **in progress**: transient spawn placeholders/busy animation, text-link
lines, live-motion tuning, large-graph performance verification, window memory,
and a real CLI UI walkthrough remain. M5 also needs library-folder switching,
reset/validation UX and first-run manual acceptance. Sanitized math/diagram
rendering still needs dedicated browser QA. These gates are not implied by the
fake-tutor tests. See the [implementation plan](/plans/v0-1-0.md).
