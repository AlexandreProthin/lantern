---
type: Architecture
title: "PoC: the Learn room"
description: How the throwaway proof of concept in poc/ is wired end to end, and what it deliberately cuts corners on.
tags: [poc, learn-room, tauri, svelte]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
resource: /poc
---

Throwaway code (about 1600 lines) that shows a conversation with a tutor grows a persistent
graph. The user judged it "very close to what I want" on 2026-09-29. Run instructions and the
user-facing loop are in `poc/README.md`.

# Data flow of one turn

```
Graph/Panel (Svelte)  ──action──▶  Session  ──prompt──▶  backend.infer  ──▶  Tauri `infer`
      ▲                              │                                          │
      │                        parse blocks                              ClaudeCliProvider
      └──── graph changes ◀──────────┘◀── streamed `llm-chunk` events ◀── `claude -p`
```

1. The learner acts on a node (light up, ask, test me). `Session` builds a prompt from the
   [Learn room prompts](/components/learn-room-prompts.md).
2. `infer` runs the [provider](/components/inference-provider.md) on a blocking thread and emits
   `llm-chunk` events; the panel renders the streamed text with the tagged blocks hidden.
3. When the reply completes, the [blocks are parsed](/decisions/tagged-blocks-protocol.md) into
   graph changes and the [subject is saved](/components/subject-model.md).

# Shortcuts taken (PoC only)

- The graph lives directly on the subject; there is no separate room layer.
- The whole map is sent as context on every turn, see [context-scaling](/issues/context-scaling.md).
- One process per call, see [llm-latency](/issues/llm-latency.md).
- The `learn` room and the `lantern-poc/1` save format are not stable contracts.
