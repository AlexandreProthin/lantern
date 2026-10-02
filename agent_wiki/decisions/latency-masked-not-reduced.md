---
type: Decision
title: Latency is masked with motion, not reduced
description: v0.1.0 accepts LLM waits and covers them with streaming text and a spawn animation instead of changing protocol or model.
tags: [latency, ux, animation]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-01T21:45:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Decided 2026-10-01. Decided with the user in the spec workshop, round 1.

# Context

[llm-latency](/issues/llm-latency.md) measured about 25 s to light a node. Levers existed:
options-first protocol, cheaper models for cheap tasks, a faster provider.

# Options

| Option | Verdict |
|---|---|
| Reduce latency (options-first, cheap models, API provider) | Deferred to a later version. |
| Accept it and mask it | Chosen. |

# Decision

Latency is not a constraint for v0.1.0. Waits over about 10 s are fine as long as text streams
and animation carries the wait: child nodes spawn and grow from the parent as neutral shapes
while the node lights up. The [tagged-blocks-protocol](/decisions/tagged-blocks-protocol.md)
stays as it is.

# Consequences

- The UI needs a placeholder state for children whose titles are not yet known.
- Cancelling a generation must always be possible (see [product-scope](/specs/product-scope.md)).
