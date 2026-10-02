---
type: Decision
title: PoC scope is the Learn room only
description: The proof of concept covers one use case, learning, with a graph, a view panel and one LLM provider.
tags: [poc, scope, learn-room]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Decided 2026-09-27. Built 2026-09-28 in [poc/](/architecture/poc-learn-room.md).

# Decision

The PoC covers **learning** only: a graph, a view panel, and one LLM provider (Claude Code
CLI).

# Why

It is the smallest loop that proves the core idea: a conversation feeds a persistent graph.
The other rooms can wait until that loop is shown to be worth building.

# Outcome

Tried 2026-09-29: the user reports the PoC is "very close to what I want". The loop works;
what is still off has not been recorded yet and will feed the specs (see the
[roadmap](/plans/roadmap.md)).
