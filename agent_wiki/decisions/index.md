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
* [A subject is one JSON file](subject-single-json-file.md) - Not an OKF bundle or a folder; exports come later.
* [One graph per room visit](graph-per-room-visit.md) - A concept relevant in two rooms exists twice.
* [A room owns a set of spaces](rooms-have-spaces.md) - Learn: welcome, learning space, gallery.
* [v0.1.0 is a daily-use Learn room](v010-daily-tool-learn-only.md) - Real daily tool, modular for future rooms.
* [Latency is masked, not reduced](latency-masked-not-reduced.md) - Streaming and spawn animation carry the wait.
* [Merge is Later](merge-deferred.md) - v0.1.0 is a tree with text links; the format stays merge-ready.
* [Prompts are app-internal and versioned](prompts-internal-versioned.md) - Each generation records its prompt version; evals guard changes.
* [Sign-in is instructions only in v0.1.0](cli-signin-instructions-only.md) - Step-by-step instructions plus Check again; Lantern opening the sign-in is Later.
* [Welcome and Gallery belong to each room](spaces-per-room-no-home.md) - No Home yet; the app reopens the last room.
* [Choose research calls may search the web](choose-web-tools.md) - WebSearch and WebFetch only, for Choose research tasks; no cheaper web model.
* [lantern/2 makes the format room-neutral](format-lantern-2.md) - Neutral roles, a data container for room fields; Learn files converted.
* [The web demo replays prepared answers](web-demo-prepared-answers.md) - Free Learn demo on GitHub Pages: scripted tutor, two subjects, release tags.
* [Lantern is licensed GPL-3.0-or-later](gpl-3-licence.md) - Copyleft keeps forks open and credit stays; name and logo excluded.
