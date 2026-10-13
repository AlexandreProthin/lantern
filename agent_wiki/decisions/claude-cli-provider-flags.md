---
type: Decision
title: Claude CLI provider flags
description: Why the CLI provider runs in safe mode from a temp directory rather than with --bare.
tags: [llm, claude-cli, provider]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Decided 2026-09-28.

# Decision

```
claude -p --output-format stream-json --verbose --include-partial-messages
       --safe-mode --strict-mcp-config --no-session-persistence
       --tools "" --system-prompt <room prompt>
```

The user prompt goes through **stdin**, and the working directory is the OS temp directory.

# Why

- `--bare` would be leaner but **refuses OAuth** (API key only), which breaks the goal of
  running on the subscription.
- `--safe-mode` plus a neutral cwd keeps the user's `CLAUDE.md`, skills and MCP servers out of
  the tutor's context, so the tutor behaves the same on every machine.
- `--tools ""` because the tutor only talks; it must never touch files.
- `--no-session-persistence` so tutor calls do not pollute the user's Claude Code history.
- stdin avoids the command-line length limit and quoting problems on Windows.
- `--include-partial-messages` gives `text_delta` events, which is what makes streaming work.

# Consequences

About 3 s of fixed overhead per call; an introduction takes about 12 s and lighting a node
about 25 s. See [llm-latency](/issues/llm-latency.md).

Implemented in [inference-provider](/components/inference-provider.md).

Amended 2026-10-13 for the Choose room's research tasks only: [choose-web-tools](/decisions/choose-web-tools.md).
