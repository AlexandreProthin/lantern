---
type: Decision
title: Inference sits behind a provider trait
description: The LLM is a pluggable provider; the Claude Code CLI is the first implementation so Lantern runs on a subscription.
tags: [llm, provider, rust]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
---

Decided 2026-09-27, built in the PoC 2026-09-28.

# Context

The user wants to plug in other providers later (Anthropic API, a local LLM), but also wants
Lantern to run on an existing subscription with no API key to manage.

# Decision

- The app only talks to the `InferenceProvider` Rust trait: one method that streams text
  chunks and returns the full text. See [inference-provider](/components/inference-provider.md).
- The first implementation is `ClaudeCliProvider`, which drives `claude -p --output-format
  stream-json`. See [claude-cli-provider-flags](/decisions/claude-cli-provider-flags.md).
- The model is picked with the `LANTERN_MODEL` environment variable; the CLI default is used
  otherwise.

# Options

| Option | Verdict |
|---|---|
| Claude Code CLI first | Chosen: no API key, uses the subscription. |
| Anthropic API directly | Deferred: needs a key and billing setup; fits behind the same trait later. |
| Local LLM | Deferred: same trait. |

# Consequences

Every call spawns a process, which costs about 3 s of overhead before the model starts (see
[llm-latency](/issues/llm-latency.md)). The trait makes a faster provider a drop-in change.
