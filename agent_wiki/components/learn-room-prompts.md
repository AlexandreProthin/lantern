---
type: Component
title: Learn room prompts
description: The tutor's system prompt, the per-task prompts, the context each one carries, and the reply parsing.
tags: [learn-room, prompts, context]
status: deprecated
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
resource: /app/src/rooms/learn/prompts.ts
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Superseded by [tutor-protocol](/specs/tutor-protocol.md) (prompts `learn-1`, now `learn-3`), [context-assembly](/specs/context-assembly.md) and [Learn runtime](/components/v010-learn-runtime.md). This page describes the PoC prompts as they were (tag `poc-final`).

Seeded from the `learning-session` skill (see [related projects](/references/related-projects.md)).

# Tutor method (system prompt)

- Never dump everything: cover only the node the learner chose.
- Teasers are a title plus one line of hook, never a mini-explanation.
- When giving options, exactly 3, genuinely distinct, mixed kinds (deeper, application,
  adjacent, exercise).
- Do not re-explain what is lit elsewhere; refer to it by name.
- The learner does the work: nudge and correct, do not hand over the answer.
- Reply in the learner's language (that of the subject title unless they switch).

# Tasks

| Prompt | Used for | Ends with |
|---|---|---|
| `introPrompt` | the subject root: short on-ramp | 3 axes |
| `explorePrompt` | lighting a node | 3 ways to go deeper |
| `replyPrompt` | learner message on a node | optional `<understood/>` / `<branch>` |
| `checkPrompt` | "Test me": one understanding question | nothing |
| `suggestPrompt` | home screen: 3 subject ideas | options only |

# Context sent on each turn

- The **whole map** as an indented outline with `[open]`/`[lit]`/`[understood]` marks and a
  `<== current node` marker.
- The path to the node, and the parent's explanation clipped to 2500 characters.
- For dialogue: the node's own explanation (clipped to 6000) and its dialogue so far.

This does not scale to large subjects: [context-scaling](/issues/context-scaling.md).

# Parsing

`visibleText` cuts at the first `<options>`/`<branch>` and strips `<understood/>` and any
half-streamed tag; `parseOptions` keeps at most 3 entries. The protocol and its reasons are
in [tagged-blocks-protocol](/decisions/tagged-blocks-protocol.md).
