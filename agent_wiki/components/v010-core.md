---
type: Component
title: v0.1.0 core and storage
description: Room-independent domain contracts, persistence safety, and M1 validation evidence.
resource: /app/src/core/model.ts
tags: [core, storage, implementation, v0.1.0]
status: stable
generated: { by: Claude/Sonnet-5.5, at: 2026-10-02T19:50:00Z }
---

# Domain contract

The pure TypeScript core implements [domain-model](/specs/domain-model.md)
DM-1 to DM-55 and the shared [statistics](/specs/welcome-gallery.md) WG-30 to
WG-36. Room policy and generation coordination remain in the room module.

`parseSubject` validates untrusted JSON, including graph topology, state/provenance,
dialogue and generation records. Deleted node ids remain legal in the permanent log.
Graph operations refuse root deletion and preserve the log while deleting a subtree.
Repeated learner edits preserve the first model original; revert restores it.
Imported PoC provenance uses an explicit `unknown` author rather than inventing a model.

Statistics count every logged outcome, exclude dismissed nodes from progress, and
do not add thinking or cache tokens to input/output. Whole-number model shares use
largest remainder rounding so they total 100; zero-output logs have no shares.

# Evidence and remaining work

2026-10-02: seven focused domain tests passed (nine units including M0), covering
JSON round-trip, topology rejection, state transitions, duplicate titles, subtree
deletion, edit/revert and statistics.

Rust storage implements safe ids, atomic same-directory writes, hash/mtime/size
receipts, clean reload and dirty conflict copies, higher-major read-only handling,
app-side state and summary cache, Recycle Bin deletion and backed-up PoC import.
Nanosecond receipt timestamps cross the JS bridge as strings to retain precision.
Storage commands are serialized behind a mutex. The frame persistence controller
debounces 300 ms, serializes in-flight edits, retains failed saves for retry and
flushes explicitly on close; wiring its callbacks and close handler into the Study
frame belongs to M3. Errors, reload toasts and conflict banners must remain visible.

Seven Rust tests passed, including migration idempotence/backup preservation,
conflict-copy exclusion and cache rebuild. Four frame persistence tests passed.
ST-50 measured 500-node save 69.262 ms and load 18.747 ms in debug on this machine.
After removing an unnecessary reread, five-sample medians were 26.356 ms save and
32.703 ms load. Under simultaneous prompt evals/process-spawn tests, a later median
save was 171 ms. The strict timing gate now runs separately (ignored in the normal
unit suite); it has not been declared reliably passed under that loaded condition.
Svelte/TypeScript check passed with zero errors/warnings before M2 work began.

M1 exit evidence is now complete. The two real PoC subjects now present in
`Documents/Lantern/subjects` (`la-vanille-0b44`, 20 nodes; `peer-to-peer-over-the-internet-8eea`,
10 nodes) were copied to a temp library and run through the real `import_poc` path by the
ignored test `real_poc_subjects_import_validate_and_round_trip` (`LANTERN_POC_DIR=<copy dir>`):
both import, pass `validate_subject`, keep all node fields and dialogue turns, have a
byte-identical `.poc-backup`, save and reload equal, re-import is idempotent, and list and
thumbnails work. The originals were verified unchanged by hash. Recycle Bin: the ignored test
`delete_subject_sends_file_to_real_recycle_bin` sends a disposable subject through `delete_subject`
to the real Windows Recycle Bin and confirms it left its path (the probe file stays in the bin);
the implementation has no permanent-delete fallback. See the
[implementation plan](/plans/v0-1-0.md).
