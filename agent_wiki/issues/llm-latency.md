---
type: Issue
title: LLM latency
description: Each call takes seconds because the CLI provider spawns a process; lighting a node takes about 25 s.
tags: [latency, provider, claude-cli]
status: draft
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
---

# Measured (2026-09-28, PoC)

| Call | Time |
|---|---|
| Fixed overhead of one `claude -p` call | about 3 s |
| Introduction | about 12 s |
| Lighting a node | about 25 s |

Streaming hides part of it, since text appears as it is generated, but the options that make
new nodes only arrive at the end of the reply.

# Levers

- A provider that keeps a session or talks to the API removes the process overhead (see
  [pluggable-inference-provider](/decisions/pluggable-inference-provider.md)).
- A smaller model via `LANTERN_MODEL` for cheap tasks.
- Ask for the options block *first* so nodes appear before the explanation finishes; this
  conflicts with the current tagged-blocks-at-the-end design
  ([tagged-blocks-protocol](/decisions/tagged-blocks-protocol.md)).
