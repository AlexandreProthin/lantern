# Components

* [v0.1.0 release preparation](/components/v010-release.md) — installer configuration and native acceptance boundary.

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
* [Web demo](web-demo/index.md) - The Learn room on GitHub Pages with prepared answers: runtime and content.

- [v0.1.0 core and storage](/components/v010-core.md) — M1 domain contracts and persistence evidence.
- [v0.1.0 Learn runtime](/components/v010-learn-runtime.md) — M2 protocol, context, provider, coordinator and eval evidence.
- [v0.1.0 Frame and Study](/components/v010-study.md) — M3 UI and Settings foundations, browser evidence and remaining gates.
- [v0.1.0 Settings and library switching](/components/v010-settings.md) — M5 implementation and native acceptance boundaries.
- [Amber, the companion](/components/amber-companion.md) - Placement, rope and motion, Ask Amber's one-call chat with its category gate, greetings, the app-level log.
- [Choose room](/components/choose-room.md) - The decision graph, Compare table and Gallery; session lanes, protocol parser and `choose-1` prompts.
- [Endpoint provider and API keys](/components/endpoint-provider.md) - Local and cloud endpoints in Rust, keys in Windows Credential Manager, routing by model id, Settings → Endpoints.
- [Update check and local feed](/components/update-channel.md) - Update commands, the loopback feed for a local release folder, and the frame's controller and rules.

- [v0.1.0 Welcome and Gallery](/components/v010-library-spaces.md) — M4 screens, library actions, thumbnails and shared motion.
