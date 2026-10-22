---
type: Component
title: v0.1.0 foundation
description: New app boundaries, local validation commands and milestone implementation evidence.
resource: /app/README.md
tags: [implementation, v0.1.0, testing]
status: stable
generated: { by: Codex/GPT-6, at: 2026-10-02T06:42:04Z }
---

# Boundaries

The [implementation plan](/plans/v0-1-0.md) starts in a fresh `app/` directory.
`poc/` remained unchanged (removed on 2026-10-04, kept at tag `poc-final`). Pure core code owns domain operations; Learn owns prompts
and context; frame owns application coordination. Rust owns storage and inference,
with OS code confined to paths and provider ([quality](/specs/platform-quality.md) PQ-2).

# Validation

Commands are documented in `app/README.md`. Unit, Rust and Playwright tests are
separate gates. The shell smoke test is M0 coverage; the full main-loop scenarios
are M3 work. Fake provider browser work requires no subscription.

# Progress

M0 contains a Tauri 2 / Svelte 5 / TypeScript shell, single-instance plugin,
central strings, browser/fake mode switch, Vitest and Playwright configuration,
and Rust storage/provider/paths module boundaries. It deliberately has no Study UI.

The Rust lockfile keeps `tauri-runtime` 2.9.2, `tauri-runtime-wry` 2.9.3,
`tauri-macros`/`tauri-codegen` 2.6.3 and `tauri-utils` 2.9.3, matching the working
PoC family. Fresh unconstrained resolution pulled incompatible Windows types
and menu macros; use the committed lockfile and `--locked` for checks.

Local M0 checks: 2 Vitest units, Svelte check (zero errors/warnings), production
web build, 1 Playwright shell smoke test and 1 Rust scaffold test passed.
The wiki validates with zero errors and warnings. The sandbox needs approved child-process access for esbuild,
Chromium and Rust; this is an execution-environment constraint, not an app setting.

M0 is complete. Implementation resumed at the user's request on 2026-10-02, while
the user works on D1. [M1 core and storage](/components/v010-core.md) now has committed
domain work and persistence validation evidence. M1 and M2 follow the [domain](/specs/domain-model.md), [storage](/specs/subject-storage.md),
[provider](/specs/inference-provider.md), [protocol](/specs/tutor-protocol.md) and
[context](/specs/context-assembly.md) contracts.
