---
type: Component
title: v0.1.0 Frame and Study
description: Room-contributed Study UI, graph and node panel, rendering, settings foundations and browser evidence.
resource: /app/src/frame/Shell.svelte
tags: [implementation, frame, study, graph, panel, settings]
status: draft
generated: { by: Codex/GPT-6, at: 2026-10-02T17:40:00Z }
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

The ephemeral graph scene creates three simulation bodies for light/more. They
reserve tree slots, breathe while pending, reveal with stable DOM keys and transfer
their exact simulation positions to arriving nodes; surplus/cancelled slots shrink.
They never enter saved data or stats. Reply/check use a node pulse. Motion constants
live in `graphMotion`; the Appearance override cancels motion live. Text relations
from every node are deduplicated, curved, dotted, and separate from tree/route edges.
Offscreen focus pans at the current zoom; recenter animates without changing focus.
Transforms and focus history are kept per open subject. Slow settling switches to
half-rate simulation and removes glows; graphs above 800 nodes use tree layout.

The panel supports the fake-tutor loop, streamed text, cancellation, checks,
dismiss/restore, own nodes, selection actions, subtree deletion, learner edits and
previous-version comparison/revert. Markdown uses sanitized MarkdownIt output,
KaTeX, code highlighting/copy and lazy Mermaid rendering after streaming ends.

Settings foundations provide versioned atomic backend storage, unknown-key
preservation, corruption recovery, debounced writes, room-contributed controls
and an explicit tiny provider test. External links use a scheme-checked system
adapter. The summary cache filename is `summaries.json` (SE-51).

# Evidence and remaining gates

- Type check: zero errors and warnings.
- 33 TypeScript tests pass, including transient scene, relation deduplication,
  settings preservation and disconnected-monitor fallback.
- Seven Playwright tests pass: startup stub; fake Study loop with edits,
  dismiss/restore and restart persistence; cancellation; in-place spawn in both
  layouts; math/Mermaid/code/escaped HTML; settings validation/reset/health/motion; missing-provider readiness instructions.
- Sixteen Rust tests pass, including app-state migration/future shapes and
  interruption recovery; real CLI and the idle benchmark are explicit opt-in gates.
- Idle ST-50 five-sample medians: save 63.24 ms, load 25.47 ms for 500 nodes;
  both meet the unchanged 100/200 ms thresholds.

The isolated 500-node browser gate passed at 16.7 ms median, 33.4 ms p95 for
120 zoom frames; node position styles stayed unchanged. The empty-view baseline
was 16.7 ms. Earlier samples failed near 33.3 ms median, so this is one idle
browser result, not proof of native-device performance. The test pre-settles its
fixture, restores normal motion, and measures viewport transforms; it does not
attest animated settling smoothness. Thresholds remain 20 ms median/34 ms p95.
It is deliberately separate from regular tests (`LANTERN_PERF=1`).

M3 remains **in progress** until user motion tuning, native-device performance
and a real CLI UI walkthrough. [Settings and library switching](/components/v010-settings.md)
also await first-run native acceptance. Welcome/Gallery (M4) await D1.
See the [implementation plan](/plans/v0-1-0.md).
