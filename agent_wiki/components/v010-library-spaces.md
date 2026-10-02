---
type: Component
title: v0.1.0 Welcome and Gallery
description: D1 Welcome implementation and summary-backed Gallery, library actions, lazy thumbnails and shared ember motion.
resource: /app/src/rooms/learn/Welcome.svelte
tags: [implementation, welcome, gallery, library, suggestions]
status: draft
generated: { by: Codex/GPT-6, at: 2026-10-02T19:20:00Z }
---

# Implemented

The D1 design branch is merged into master, preserving the final r005-03
*Embers* recipe and its full design history. [Welcome and Gallery](/specs/welcome-gallery.md)
now have real space components. Welcome's header shows all three space icons (Study and Gallery disabled with no subject, RS-20/RS-11); Ctrl+2 works too.
The local tone and model choices reset from Settings on each arrival, apply only
to a newly created subject, and leave Settings unchanged. Effort stays the default.
Creation writes the subject before opening Study and starting its intro.

Welcome ports the recipe's centered field, underline/glow, quiet tone and model
controls, suggestion chips and dimmed recent-card shelf. The canvas uses the same
travel duration, ember fan and trail functions as Study (`embers.ts`), with the
existing `graphMotion` constants. Handoff uses a timer, so paused animation frames
cannot prevent creation. OS and app reduced-motion preferences suppress effects.

`app/src/frame/catalogue.ts` takes the existing Rust `list_subjects` summary
shape plus `read_state`'s `lastOpenedAt` and `recents`. No full subject read is
needed to sort, select or show detailed stats (WG-35/68). Recent cards use actual
last-opened timestamps, rather than file edits or the potentially stale recents
array. Sorting has title A-to-Z ties in both directions. Filter typing waits
150 ms; clearing it cancels any queued filter immediately (WG-53/54).

The Shell keeps one `Catalogue` for the session, preserving filter/sort across
space switches. Gallery adds a responsive grid, roving keyboard selection,
expanded details, inline rename, default-Cancel delete confirmation and Explorer
reveal. Rename flushes through the existing persistence controller. Deletion
cancels and awaits generation, flushes its final log, then recycles the file and
removes the open controller; it cannot later recreate a deleted file. The browser
surrogate retains a recovery copy in localStorage; desktop uses the Recycle Bin.

Thumbnails load when visible, cache by path/mtime/size in memory, and reuse the
live tree layout. The Rust projection deserializes graph metadata while skipping
content, dialogue and logs, returns at most 60 breadth-first nodes, omits dismissed
nodes, and reports overflow. Selection and details never load the subject file.

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

Five library browser scenarios cover create/continue and last focus, model/tone
isolation, rename/delete, suggestions/retry, filtering across navigation, hidden
usage, bounded thumbnails, cancellation-before-delete and timer-driven handoff.
The existing Study/Settings scenarios remain passing. Native thumbnail projection
also has a passing Rust test. Screenshot review caught and fixed text clipping
in the underline animation.

Native Explorer/Recycle Bin acceptance, user visual/motion acceptance and the
installed-app checks remain separate from browser evidence. Performance gates
are explicit idle-machine tests in `library-performance.spec.ts` and Rust
`fifty_cached_summaries_meet_wg43`; see the final run evidence in the plan/log.
See [release preparation](/components/v010-release.md),
[Study](/components/v010-study.md), [Settings](/components/v010-settings.md)
and the [implementation plan](/plans/v0-1-0.md).
