# Decisions

Choices that were made and the reasoning that produced them, ADR-style: the
context, the options considered, what was chosen, and what it costs. This is
the directory that pays for the whole wiki — code shows what was decided, never
why, and the why is what gets re-litigated six months later.

Use `type: Decision`. A decision is **never rewritten**: when it stops holding,
mark it `status: deprecated` and have the replacement link back to it.

* [Room replaces lens](room-replaces-lens.md) - Why the top-level axis is called a room, and the cautions that come with it.
* [Tech stack is Prism's](prism-tech-stack.md) - Tauri 2 + Svelte 5 + TypeScript desktop app.
* [Inference sits behind a provider trait](pluggable-inference-provider.md) - The LLM is pluggable; the Claude Code CLI comes first.
* [Claude CLI provider flags](claude-cli-provider-flags.md) - Safe mode from a temp directory, not `--bare`.
* [Tutor replies end with tagged blocks](tagged-blocks-protocol.md) - How the conversation grows the graph.
* [PoC scope is the Learn room only](poc-scope-learning.md) - One use case, the smallest loop that proves the idea.
