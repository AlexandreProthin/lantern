---
type: Component
title: Inference provider
description: The Rust trait the app calls for completions, and its Claude Code CLI implementation.
tags: [llm, rust, provider]
status: deprecated
generated: { by: claude-code/sonnet-5.5, at: 2026-10-02T10:00:00Z }
resource: /app/src-tauri/src/provider.rs
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Superseded by the [inference-provider spec](/specs/inference-provider.md) and its v0.1.0 implementation in [Learn runtime](/components/v010-learn-runtime.md). This page describes the PoC provider as it was (tag `poc-final`).

# Contract

`InferenceProvider::stream(request, on_text) -> Result<String, String>`

- Input: `InferenceRequest { system, prompt }`.
- Calls `on_text` for each streamed text chunk, returns the complete text when done.
- Blocking: callers run it on a blocking thread (`spawn_blocking` in the `infer` command in
  `poc/src-tauri/src/lib.rs`).

`ClaudeCliProvider` is the only implementation. Its flags and their reasons are in
[claude-cli-provider-flags](/decisions/claude-cli-provider-flags.md); why there is a trait at
all is in [pluggable-inference-provider](/decisions/pluggable-inference-provider.md).

# Things that surprise

- Errors come back as a final `result` line with `is_error: true`, not as a non-zero exit
  code, so the stream must be read to the end before judging success.
- If no `text_delta` was seen but a final `result` exists, that text is emitted in one piece,
  so the UI still shows something.
- On Windows the child is started with `CREATE_NO_WINDOW`, otherwise a console window flashes
  on every call.
- An ignored test (`cargo test -- --ignored`) makes a real CLI call.
- Checked 2026-10-01 (CLI probe, Haiku): the CLI accepts `--effort low|medium|high|xhigh|max` next to
  `--model`. The `system/init` line reports the resolved model id; the final `result` line carries
  `duration_ms`, `total_cost_usd` (API-equivalent) and `usage` (input, output, cache creation/read,
  and `output_tokens_details.thinking_tokens`). This is what the generation log in the
  [domain model](/specs/domain-model.md) records.
- Even with `--tools ""` and a one-line prompt, a call created about **13k cache tokens**: the CLI's
  own baseline context, paid on every call before Lantern's prompt. It is reported in the usage and logged, but it sits **outside** Lantern's context budget, which covers only Lantern's own prompt ([context-assembly](/specs/context-assembly.md) CA-12).

