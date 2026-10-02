---
type: Decision
title: Tech stack is Prism's
description: Lantern is a Tauri 2 + Svelte 5 + TypeScript Windows desktop app, the same stack as Prism.
tags: [stack, tauri, svelte]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Decided 2026-09-27.

# Decision

Tauri 2 (Rust) shell, Svelte 5 + TypeScript front end, shipped as a standalone Windows
desktop app.

# Why

The stack is proven in [Prism](/references/related-projects.md), so code, patterns and tooling
can be reused: the graph view, panels, installer and updater. The PoC already reuses the
graph and panel patterns (d3-force graph in `poc/src/lib/Graph.svelte`).

# Consequences

- The LLM lives on the Rust side behind a provider trait, see
  [pluggable-inference-provider](/decisions/pluggable-inference-provider.md).
- The front end can run alone in a browser (`npm run dev`) against a canned fake tutor for UI
  work, because all backend calls go through one module (`poc/src/lib/backend.ts`).
