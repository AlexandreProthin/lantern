---
type: Spec
title: Platform and quality bar
description: Windows-only platform rules, localisation readiness, required test layers, prompt evals and installer for v0.1.0.
tags: [platform, testing, quality]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-02T08:15:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Source: spec workshop rounds 1–3 (2026-10-01/02). Agreed with the user 2026-10-02 (q-r3-review).

# Requirements

## Platform

- **PQ-1** v0.1.0 MUST target Windows only.
- **PQ-2** Windows-specific code MUST be confined to the provider and paths modules, so a port stays cheap *(2026-10-22: the snap-layouts hint moved from `commands.rs` to `paths.rs`; there is no exception)*.
- **PQ-3** The tech stack MUST be the one in [prism-tech-stack](/decisions/prism-tech-stack.md) (Tauri 2, Svelte 5, TypeScript).
- **PQ-4** The UI MUST be English, and all UI strings MUST live in one module so a French translation is cheap later.
- **PQ-5** *(Added 2026-10-23, [network-serving](/specs/network-serving.md).)* The desktop app stays Windows-only, but it can serve its frontend over HTTPS on the LAN to any recent browser, phones included. The phone layout applies below 720 px (NW-40..42) and leaves the desktop window unchanged (NW-43); `tests/phone.spec.ts` checks both.

## Tests

- **PQ-20** Unit tests MUST cover the core: protocol parsing, graph mutations, storage round-trip, context assembly.
- **PQ-21** Rust tests MUST cover provider stream parsing (against recorded CLI output), file I/O and path safety.
- **PQ-22** UI end-to-end tests (Playwright against the web build with the fake tutor, [inference-provider](/specs/inference-provider.md) IP-71) MUST cover the main loop: start a subject, light a node, reply, understand, restart, and also: dismiss and restore an open node, edit a node's explanation (and see the edited mark), cancel a running generation (the node returns to its previous state), and persistence across a restart (same graph, same states, edits kept).
- **PQ-23** No CI is required in v0.1.0 (since 2026-10-17 `.github/workflows/web-demo.yml` runs on `v*` tags for the web demo); the tests MUST be runnable locally with documented commands.

## Prompt evals

- **PQ-30** Prompt evals MUST exist and run by hand against the real Claude CLI on a cheap model (Haiku). Reasoning: if Haiku follows the protocol, larger models will; the same harness can later qualify local or custom providers. *Choose room (v0.2.0, round 7):* its evals run on the default model instead, since Haiku broke the source rules ([choose-protocol](/specs/choose-protocol.md) CP-61).
- **PQ-31** Evals MUST check: exactly 3 options on light-up, valid tagged blocks ([tutor-protocol](/specs/tutor-protocol.md)), the learner's language, links using existing node ids, `<understood/>` only after a *Test me* question, and different directions on *More options*.
- **PQ-32** Layout: an `evals/` folder holds fixture subjects and cases; the runner is `npm run eval -- --model haiku [--effort low]`; results go to `evals/results/<date>-<model>.json` (git-ignored) and a summary table is printed to the console.
- **PQ-33** The bar: a prompt version MUST pass **95% or more** of the cases on Haiku before it ships; each shipped prompt records its `promptVersion` ([prompts-internal-versioned](/decisions/prompts-internal-versioned.md)). Cases that fail are listed in the summary.
- **PQ-34** Evals run by hand; there is no CI. They report tokens and time from the provider's usage, like the app does.

## Installer

- **PQ-40** A Windows installer MUST be produced (PS-18 in [product-scope](/specs/product-scope.md)).
- **PQ-41** The installer MUST be Prism's unsigned per-user NSIS installer, built locally.
- **PQ-42** The Tauri updater plugin and `createUpdaterArtifacts` MUST be wired from v0.1.0. *Superseded 2026-10-08*: the update check, notice and install now exist and are specified in [updates](/specs/updates.md); v0.1.0 to v0.1.2 shipped without them.

# Acceptance

The acceptance statement and scenarios AC-1 to AC-7 are in [product-scope](/specs/product-scope.md). For this spec, PQ-20 to PQ-22 and PQ-31 are the checks that must pass before release.

# Open

None for v0.1.0.

Related: [product-scope](/specs/product-scope.md), [inference-provider](/specs/inference-provider.md), [tutor-protocol](/specs/tutor-protocol.md).
