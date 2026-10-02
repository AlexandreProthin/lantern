---
type: Component
title: v0.1.0 library space controllers
description: Design-independent catalogue and subject-suggestion logic prepared for the D1 Welcome and Gallery integration.
resource: /app/src/frame/catalogue.ts
tags: [implementation, welcome, gallery, library, suggestions]
status: draft
generated: { by: Codex/GPT-6, at: 2026-10-02T18:29:37Z }
---

# Ready for integration

[Welcome and Gallery](/specs/welcome-gallery.md) reserve Welcome's visual design
for D1. The controllers below implement behaviour without adding UI or changing
the existing space stubs. They are tested modules, not wired into the Shell yet.

`app/src/frame/catalogue.ts` takes the existing Rust `list_subjects` summary
shape plus `read_state`'s `lastOpenedAt` and `recents`. No full subject read is
needed to sort, select or show detailed stats (WG-35/68). Recent cards use actual
last-opened timestamps, rather than file edits or the potentially stale recents
array. Sorting has title A-to-Z ties in both directions. Filter typing waits
150 ms; clearing it cancels any queued filter immediately (WG-53/54).

The space owner should keep one `Catalogue` for the session so sort, filter and
selection survive navigation (WG-55). Its notification callback can drive the
frame's revision. Pass the current grid column count to `move`; Enter/F2/Delete
remain UI actions, while arrows/Home/End/Escape are handled here (WG-65).
Refresh with `replace` after library changes; removed or hidden selections clear.
Call `dispose` on teardown to clear its filter timer.

`cardDetails` derives progress and whole-number model shares from the summary.
Largest remainders make the shares total 100%; all-zero outputs have no shares.
With token stats off, the presentation object omits token amounts and shares,
while retaining model names, tone and generation count (WG-34/36/68).

`app/src/rooms/learn/suggestions.ts` implements WG-4 using the approved `learn-1`
suggest prompt and parser. It snapshots model, effort and tone, allows only one
request at a time, exposes typed errors for retry, replaces old chips on a new
request and rejects duplicates or already-existing titles. Cancellation ignores
late successes; disposal aborts the call and suppresses later render callbacks.
Its transient context is never saved and no generation log is written.

# Evidence and remaining work

Nine new tests cover catalogue ordering/filtering/keyboard/usage presentation
and suggestion defaults, concurrency, cancellation, duplicate rejection, retry
and teardown. The full TypeScript suite passes **43/43**; Svelte/TypeScript
validation reports **zero errors and warnings**.

M4 remains incomplete: D1's recipe, UI wiring, creation/open flows, thumbnails,
rename/delete/reveal controls and browser acceptance scenarios remain. The new
controllers alone do not establish WG-43's first-render performance gate.
Native acceptance in [Study](/components/v010-study.md) and
[Settings](/components/v010-settings.md) is still separate work.
See the [implementation plan](/plans/v0-1-0.md).
