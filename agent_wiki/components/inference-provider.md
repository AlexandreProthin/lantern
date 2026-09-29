---
type: Component
title: Inference provider
description: The Rust trait the app calls for completions, and its Claude Code CLI implementation.
tags: [llm, rust, provider]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
resource: /poc/src-tauri/src/provider.rs
---

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
