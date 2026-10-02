---
type: Decision
title: Prompts are app-internal and versioned
description: Tutor prompts are not user-editable; each generation records a prompt version, and prompt evals guard every change.
tags: [prompts, evals, provenance]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-02T08:15:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Decided 2026-10-01 (spec workshop round 2, q-r2-prompt).

# Context

The user asked for a properly prompt-engineered pre-prompt, not a user-editable template. Behaviour (tagged blocks, exactly 3 options, links to existing nodes, corrections take precedence) depends on the prompt, so changes must be traceable and tested.

# Decision

- Prompts live in the app and are **versioned**; the user never edits them.
- User-facing controls are tone, model and effort only.
- Every generation records its `promptVersion` in the generation log ([domain-model](/specs/domain-model.md), DM-30), so behaviour in old subjects can be explained.
- Every prompt change is guarded by the prompt evals, run by hand on Haiku ([platform-quality](/specs/platform-quality.md)).

# Consequences

A new prompt version is a code change plus an eval run. A user-facing prompt editor is not planned. Structure of the system prompt: [tutor-protocol](/specs/tutor-protocol.md); the PoC version is described in [learn-room-prompts](/components/learn-room-prompts.md).
