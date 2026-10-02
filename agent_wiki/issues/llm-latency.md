---
type: Issue
title: LLM latency
description: Each call takes seconds because the CLI provider spawns a process; lighting a node takes about 25 s.
tags: [latency, provider, claude-cli]
status: draft
generated: { by: claude-code/sonnet-5.5, at: 2026-10-01T21:45:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
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

The 2026-10-02 `learn-1` eval measured 12 calls per task, using the resolved model
`claude-haiku-4-5-20251001`, low effort, three concurrent calls, English/French
and 5/300-node contexts. Median end-to-end durations: intro 36.5 s, light 71.5 s,
more 38.8 s, check 10.4 s, reply 14.3 s, check-answer 6.5 s. These measure the full
CLI request, not first-token latency or isolated process overhead. They are not
directly comparable with the PoC samples. All three runs passed 24/24 automatic
checks; the replies and timings remain locally under `app/evals/results/`.

- A provider that keeps a session or talks to the API removes the process overhead (see
  [pluggable-inference-provider](/decisions/pluggable-inference-provider.md)).
- A smaller model via `LANTERN_MODEL` for cheap tasks.
- Ask for the options block *first* so nodes appear before the explanation finishes; this
  conflicts with the current tagged-blocks-at-the-end design
  ([tagged-blocks-protocol](/decisions/tagged-blocks-protocol.md)).

v0.1.0 direction: accept the latency and mask it with motion, see [latency-masked-not-reduced](/decisions/latency-masked-not-reduced.md).
