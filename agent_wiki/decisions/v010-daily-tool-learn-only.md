---
type: Decision
title: v0.1.0 is a daily-use Learn room, built modular
description: The first release is the user's real daily tool with the Learn room only, but with a modular frame for future rooms.
tags: [scope, release, v0.1.0]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-01T21:45:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Decided 2026-10-01. Decided with the user in the spec workshop, round 1.

# Context

[poc-scope-learning](/decisions/poc-scope-learning.md) proved the loop. The question was what
the first real release is.

# Options

| Option | Verdict |
|---|---|
| Polished demo of the PoC | Rejected: the user wants something used every day. |
| Daily-use Learn room, modular frame | Chosen. |
| Several rooms from the start | Rejected: one room used for real teaches more than three half-built. |

# Decision

v0.1.0 is the user's daily tool: a Learn room used for real. Only Learn ships, but rooms exist
in the data model and the UI frame, and modularity and reusable components are a requirement.
Scope, deferred items and acceptance: [product-scope](/specs/product-scope.md).

# Consequences

Anything room-specific (prompts, node kinds, states, actions, spaces) lives in a Room
definition, not in the app core. Other rooms may later have their own feel while the app
stays coherent.
