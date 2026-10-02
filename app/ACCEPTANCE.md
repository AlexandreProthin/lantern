# Native acceptance before v0.1.0 release

Use the unsigned per-user NSIS preview from `npm run installer:preview`.
The approved release gates are in `../agent_wiki/plans/v0-1-0.md`; automated
browser checks do not sign off these Windows and multi-day scenarios.

- [ ] Install as the current user, launch, and create a real subject from Welcome.
  Confirm the selected tone/model, streaming intro and D1 visual/motion treatment (AC-1).
- [ ] Learn one real subject across a dogfooding week and several app restarts.
  Confirm recents, focus, graph states, edits and notes persist (AC-2/3).
- [ ] Verify abrupt termination loses no more than the last unsaved debounce window;
  test on a disposable subject/library, retaining a copy (AC-4).
- [ ] Try a long generation, inspect streaming/spawn behavior, then cancel. Confirm
  the previous state remains and no CLI children survive (AC-5).
- [ ] Walk through CLI missing, signed-out and ready instructions in a suitable
  test environment. Confirm ordinary use requires no terminal after setup (AC-6).
- [ ] Change tone/model, use the native library picker with Move/Copy/Leave, and
  check window restoration. Confirm other subjects and Settings remain intact (AC-7).
- [x] In Gallery, reveal a file in Explorer. (User-reported 2026-10-02, installed build: works.)
- [ ] In Gallery, delete a disposable subject. Confirm the actual Windows Recycle Bin contains it,
  including after cancellation. (Automated evidence only: an ignored Rust test sent a disposable subject to the Recycle Bin.)
- [ ] Try 500-node native pan/zoom.
- [x] Approve the spawn/Welcome look and motion tuning. (User-reported 2026-10-02, installed build: approved.)
- [ ] Import copies of the real PoC subjects, if available, and reopen identically.
  Automated evidence (2026-10-02): both real subjects were imported from temp copies, validated and
  round-tripped by `real_poc_subjects_import_validate_and_round_trip`; still tick by hand after
  trying them in the installed build.
- [ ] Review tutor prose for teaching quality; the automated protocol score does
  not validate factual accuracy (see `../agent_wiki/issues/tutor-prose-quality.md`).

Record failures in the wiki and fix or explicitly defer them. Only after these
gates and the user's release approval: tag v0.1.0, publish the installer, and
retire the PoC as specified by the plan. No release has been published by this work.
