---
type: Decision
title: Tutor replies end with machine-readable tagged blocks
description: The graph grows by parsing <options>, <branch> and <understood/> blocks out of the tutor's reply.
tags: [learn-room, protocol, prompts, graph]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
sources:
  - id: learning-session
    resource: /references/related-projects.md
    title: The learning-session skill (make me learn)
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Decided and built 2026-09-28 (PoC).

# Context

The core claim of Lantern is that the conversation feeds the graph. Something has to turn a
free-text tutor reply into graph changes.

# Decision

The tutor writes normal markdown, then optionally ends with tagged blocks that the app parses
and hides from the learner:

| Block | When | Effect on the graph |
|---|---|---|
| `<options>[3 × {title, hook, kind}]</options>` | intro and each "light up" | 3 new **open** child nodes |
| `<branch>{title, hook}</branch>` | a learner question opens a genuinely new direction | 1 new child node of kind `question` |
| `<understood/>` | the learner clearly showed understanding | node state → `understood` |

Node states go `open → lit → understood`. Parsing is in `parseOptions`, `parseBranch` and
`saysUnderstood` in [learn-room-prompts](/components/learn-room-prompts.md); the graph
updates are in `poc/src/lib/session.svelte.ts`.

# Why

The `learning-session` skill's rule "always end on exactly 3 teasers" maps 1:1 onto graph
growth, so the conversation literally builds the map. Tagged blocks were reliable in tests
with Sonnet 5, in French and in English.

# Options

| Option | Verdict |
|---|---|
| Tagged blocks in the reply | Chosen: one call, streams naturally, blocks are cut from the visible text. |
| A second LLM call to extract structure | Rejected: doubles the latency (see [llm-latency](/issues/llm-latency.md)). |
| Tool calls / structured output | Not used: `--tools ""` on the CLI provider, and streaming text is simpler. |

# Consequences

- Parsing is forgiving: a malformed block yields no new nodes instead of an error, so a bad
  reply degrades to "explanation without options" rather than failing.
- The visible-text filter must also hide a tag that is still streaming in (`<opt…`).
- A different room (Think, Decide) needs its own block vocabulary; nothing here generalises
  yet. See [rooms plan](/plans/roadmap.md).
