# Components

* [v0.1.0 foundation](/components/v010-foundation.md) — app boundaries and validation evidence.

One concept per real module or subsystem, each bound to what it describes with
a `resource` pointing at the path in the repository. This is the layer that
goes stale fastest, so a component concept says what the module is *for* and
what its contract is — not a line-by-line account of code that git already
tracks.

Use `type: Component`.

* [Inference provider](inference-provider.md) - The Rust trait for completions and its Claude Code CLI implementation.
* [Learn room prompts](learn-room-prompts.md) - Tutor system prompt, per-task prompts, context and reply parsing.
* [Subject model and storage](subject-model.md) - The PoC's data model and how a subject is saved.

- [v0.1.0 core and storage](/components/v010-core.md) — M1 domain contracts and persistence evidence.
- [v0.1.0 Learn runtime](/components/v010-learn-runtime.md) — M2 protocol, context, provider, coordinator and eval evidence.
- [v0.1.0 Frame and Study](/components/v010-study.md) — M3 UI and Settings foundations, browser evidence and remaining gates.
- [v0.1.0 Settings and library switching](/components/v010-settings.md) — M5 implementation and native acceptance boundaries.
- [v0.1.0 library space controllers](/components/v010-library-spaces.md) — M4 catalogue and suggestions prepared independently of D1; UI integration remains.
