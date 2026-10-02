# Specs

Behaviour contracts: what the system must do, stated so that an implementation
can be checked against it. Deliberately independent of how — a spec that
changes every time the code is refactored is a component concept in disguise.

Use `type: Spec`. Where a spec has a runnable check, link it to a concept in
[computations/](../computations/).

Stable specs from the spec workshop, rounds 1–3 (2026-10-01/02), agreed with the user on 2026-10-02. Each spec's `# Open` lists only implementation-time questions.

* [v0.1.0 product scope](product-scope.md) - What v0.1.0 is, in and out, must-keep, acceptance scenarios.
* [Rooms and spaces](rooms-spaces.md) - The room definition, spaces, navigation and the header frame.
* [Domain model](domain-model.md) - Library, subject, room visit, tree graph, nodes, relations, generation log.
* [Learn room](learn-room.md) - The Learn room's behaviour: light-up, options, dismiss, edit, understood, tone.
* [Tutor protocol](tutor-protocol.md) - The system prompt structure and the tagged-blocks reply protocol.
* [Context assembly](context-assembly.md) - The adaptive context budget and what the tutor is sent.
* [Inference provider contract](inference-provider.md) - Provider contract, error taxonomy, the Claude CLI provider, detection.
* [Subject storage](subject-storage.md) - One JSON file per subject, write safety, conflicts, versioning, PoC import.
* [Welcome and Gallery](welcome-gallery.md) - Start or continue a subject; browse all subjects with stats.
* [Graph view](graph-view.md) - Graph layouts, legend, spawn animation, navigation controls.
* [Node panel](node-panel.md) - The reading panel: content, dialogue, actions, editing, selection.
* [Settings](settings.md) - Every setting, the settings file, the panel, the library change flow, provider status.
* [Platform and quality bar](platform-quality.md) - Windows, i18n readiness, tests, prompt evals, installer.
