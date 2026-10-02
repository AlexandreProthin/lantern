---
type: Issue
title: Context does not scale with subject size
description: Every turn sends the whole map to the model, so a large subject will blow the context budget.
tags: [prompts, context, scaling]
status: draft
generated: { by: claude-code/sonnet-5.5, at: 2026-10-01T21:45:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

# Problem

[learn-room-prompts](/components/learn-room-prompts.md) sends the full map outline, the
parent's explanation and the node's dialogue on every turn. Fine for a PoC subject of a few
dozen nodes; a long-lived subject will exceed the budget and cost more latency per turn.

# Ideas, none tried

- Send only the path, the siblings and the neighbours, plus a summary of the rest.
- Keep a rolling summary per node.
- Different context rules per room.

This is the "prompt engineering and context management" topic in the README's open work.

v0.1.0 direction is adaptive context (the whole map within a budget, neighbourhood plus all titles beyond); spec pending.
