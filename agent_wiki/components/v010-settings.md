---
type: Component
title: v0.1.0 Settings and library switching
description: Settings validation, provider health, native library picker and verified move/copy transaction, with app-side window memory.
resource: /app/src/frame/SettingsPanel.svelte
tags: [implementation, settings, storage, provider, windows]
status: draft
generated: { by: Codex/GPT-6, at: 2026-10-02T17:40:00Z }
---

# Implemented

[Settings](/specs/settings.md) have validated defaults, unknown-key preservation,
atomic/debounced writes and corruption recovery. The room contributes its submenu.
Invalid model/name/context edits stay unapplied with an inline explanation; reset
is scoped to its section and confirmed. Empty display names restore the original
Windows default. Ordinary generations and explicit tests share provider session
health. Check again refreshes CLI detection before the tiny test; opening the panel
never sends an inference call. Install/sign-in remain instructions, not automation.

The native folder picker (`IFileOpenDialog` with `FOS_PICKFOLDERS`, the File Explorer dialog, opened in the current library) and Explorer adapter live in `paths.rs`; the Library folder field is an editable input sharing the picker's `choose(path)` validation flow. Disk paths go through `dunce` (no `\\?\` prefix) and stored verbatim values are normalised on settings load; non-subject files in `subjects/` are skipped, never an error. The library
transaction in `library.rs` implements SE-30 to SE-36: absolute readable/writable
destination outside the installation directory; generation guard; flush before
switch; Move/Copy/Leave choices; preflight source files; no-clobber copies; byte
verification; collision id suffixes; settings committed only after success.
Failure rolls back destination copies and restores any removed originals. Before
removing originals, a move writes verified backups and a durable app-side transfer
journal. Startup recovers an uncommitted move and restores the old library pointer;
a committed marker makes backup cleanup idempotent. Failed restoration keeps the
journal/backups/destination copies. Tests cover collisions, corrupt-source preflight,
failed Settings commits and simulated interruption recovery, preserving unknown
Settings keys.

Window size, position and maximized state are debounced in `state.json`, separate
from Settings. A disconnected monitor restores to the primary display. App-state
legacy migration keeps `.bak`; future-format field shapes remain read-only;
unknown keys survive writes and corrupt files retain timestamped backups.
The shell close path flushes subject, settings and window writes before destroying
the window; the capability explicitly permits that operation.

# Remaining acceptance

The fake browser test covers validation, scoped reset, provider health and live
motion persistence. The native picker/Explorer/window APIs compile but require a
manual Windows walkthrough. AC-6/7 (CLI missing, signed out, ready; library flow)
are not signed off. Real auth/quota/network captures remain unavailable without
changing the user's current CLI session. Frame readiness banners share the same install/sign-in instructions and
Check again path; their fake failure/recovery browser scenario passes. Other
error actions still need the first-run acceptance pass. The [plan](/plans/v0-1-0.md) keeps M5 in progress.
