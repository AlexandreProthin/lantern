---
type: Component
title: v0.1.0 Learn runtime
description: The learn-1 and learn-2 parser, deterministic context, provider bridge, fake tutor, action coordinator and eval evidence.
resource: /app/src/rooms/learn/session.ts
tags: [learn, protocol, provider, context, evals, implementation]
status: stable
generated: { by: Codex/GPT-6, at: 2026-10-02T19:30:00Z }
---

# Contracts

M2 implements [protocol](/specs/tutor-protocol.md) TP-1 to TP-43 and
[context assembly](/specs/context-assembly.md) CA-1 to CA-52, using the approved
`learn-1` prompt text and task templates. The parser filters the complete raw stream
on each update; filtering already-filtered chunks would leak JSON after a split tag.
Completed code fences remain visible. Blocks in the wrong task never change graph state.

Context preserves every title even when the map floor exceeds the configured budget
(CA-23). Optional hooks are a prefix of the specified priority order. Learner corrections
have larger safety caps, and check status comes from the adjacent tutor turn's log record.

The Learn coordinator starts only one call per subject, snapshots its settings, keeps
learner messages across failed replies and retries, and commits successful content,
children, state and log in one graph swap. Deleted-target races log cancellation.
Core operations remain [room independent](/components/v010-core.md).

# Provider

The Rust [provider contract](/specs/inference-provider.md) uses per-request channels,
blocking worker calls, stdin prompts, isolated temp cwd and the approved CLI flags.
Stream parsing reads `system/init` for the resolved model and `result` for outcome,
usage and duration. Cancellation and the 120-second event stall timeout kill a Windows
Job Object with kill-on-close semantics. Stderr is drained concurrently so it cannot
fill a pipe and deadlock a call. The fake tutor provides the same TS contract with
configurable delays and typed injected failures.

# Evidence

- 28 TypeScript tests passed, including parser/context cases and five action scenarios.
- Type check passed with zero errors/warnings before the Study graph port.
- Real Claude Code 2.1.274 fixtures cover success with thinking and invalid-model output;
  local ids/paths are redacted. Other taxonomy cases are synthetic fault tests, explicitly
  distinguished in the fixture README. Real captures of auth/quota/network failures remain.
- The real Rust Haiku stream/cancel integration test passed in 4.37 seconds total.
- A Windows job test started a hidden child and grandchild and confirmed zero active
  processes after cancellation.
- Three real `learn-1` Haiku/low eval runs: each 24/24 (100%), 72/72 overall.
- v0.1.1: `learn-2` (adds `DIRECTION_BLOCK`, TP-13) passed three real Haiku/low runs on 2026-10-05, each 24/24
  (72/72), with the small fixtures carrying a direction. The shipped prompt is now `learn-2`.
  The gate is at least 95% on **each** run; the language check is lexical and still
  requires prose review. Results are local under `app/evals/results/`.

Agent sampling of first-run English/French prose confirmed the requested languages
but found internally inconsistent analogies. This is recorded separately as
[tutor prose quality](/issues/tutor-prose-quality.md); the automatic percentage is
a protocol score and does not sign off pedagogy. The prompt approved at v0.1.0 was `learn-1`; the shipped one is now `learn-2`.

A final pre-acceptance Haiku/low run on 2026-10-02 also passed **24/24 (100%)**,
with the unchanged `learn-1` prompt. The detailed local result is
`app/evals/results/2026-10-02T19-29-25-855Z-haiku.json`. The same prose-quality
limitation applies; this is not a pedagogy sign-off.

Study rendering and motion tuning are M3; D1 is merged and M4 is implemented.
See the [plan](/plans/v0-1-0.md) and [latency evidence](/issues/llm-latency.md).
