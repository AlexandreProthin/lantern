# Wiki Update Log

## 2026-10-08

* **Update notification** (branch `worktree-update-notification`, from the [backlog](/plans/backlog.md) entry, now removed): new spec [updates](/specs/updates.md) (UP-1 to UP-50, status `draft` until the user verifies it), with [settings](/specs/settings.md) (`updates.checkAtLaunch`, `ui.lastUpdateCheck`, `ui.dismissedUpdate`, SE-22) and [platform-quality](/specs/platform-quality.md) PQ-42 (superseded) amended first. The user chose: launch check at most once a day plus a manual *Check for updates* in Settings → General, a quiet *Install* / *Later* notice, and a locally generated key pair (only the public key reaches the repository). Implementation: Rust `check_update` / `install_update` (`app/src-tauri/src/updates.rs`; the webview never contacts GitHub, so CSP and capabilities are unchanged), `app/src/frame/updates.ts` (pure rules) and `updates.svelte.ts` (controller), the notice in `Shell.svelte`, the controls in `SettingsPanel.svelte`, `app/scripts/make-latest-json.mjs`. Verified: `npm run check` 0/0, 54 TS tests, 2 new Rust tests, Playwright all pass on a private port (the shared port 1431 was held by other sessions' dev servers). **Not yet verified**: a real download and install, which needs the user's public key and a signed release (the first such release must be installed by hand once, UP-44).

## 2026-10-07

* **Search in a subject** ([graph-view](/specs/graph-view.md) GV-57, new; Ctrl+F row in the GV-76 table): a magnifier left of the layout toggle, or Ctrl+F in Study, opens a field that matches titles, hooks, explanations and dialogue ignoring case, accents and spaces; matches get an accent ring, the rest dim, a count reads *n matches* / *k of n*, Enter / Shift+Enter step through them in tree order with `setFocus`, Esc closes. Matching is the pure `app/src/rooms/learn/graph-search.ts` (unit tested); browser test GV-57 passes 40/40 repeated runs.
* **Sibling order fix** ([domain-model](/specs/domain-model.md) DM-10): siblings created by one reply shared a `createdAt` millisecond, so their order fell back to object key order, where an all-digit random id (about 2 % of ids) jumps first; search order and arrow-key sibling moves (GV-70) could shuffle. Timestamps the app writes now strictly increase, and ties (older files) break by `id` in `childrenOf` and the tree layout, as the context builder already did. Verified: `npm run check` 0/0, 51 TS tests, Playwright 20 passed (2 idle perf skipped) in three full runs.
* **Backlog**: four entries from the user: subject export (format to be decided properly first), regenerate an explanation, a cheaper model for cheap tasks, and an update notification ([backlog](/plans/backlog.md)).

## 2026-10-06

* **Installed-build checks closed**: the user reported "everything as expected" for v0.1.1 F2 (*Open* reveals in Explorer, right-click copies the path), F5 (pedagogy and motion of the Welcome direction) and the v0.1.0 leftovers (500-node native pan/zoom, Recycle Bin delete).
* **Settings shows the version**: new [settings](/specs/settings.md) SE-22, General ends with *Lantern 0.1.2*, injected at build time from `package.json` (`vite.config.ts`); checked in the settings browser test.
* **Flaky test fixed**: the GV-92/94/96 browser test raced the 60 ms fake reply and sometimes missed the pending bodies; a MutationObserver now records them from page load, and the test checks all three reveal in place. 60/60 repeated runs pass. Verified: `npm run check` 0/0, 48 TS tests, Playwright 19 passed (2 idle perf skipped).
* **Cleanup**: the PoC concepts ([architecture](/architecture/poc-learn-room.md), [provider](/components/inference-provider.md), [prompts](/components/learn-room-prompts.md), [subject model](/components/subject-model.md)) are `deprecated` and name their successors. Issues: [context-scaling](/issues/context-scaling.md) addressed by context-assembly, [llm-latency](/issues/llm-latency.md) still true and unscheduled, [tutor-prose-quality](/issues/tutor-prose-quality.md) records the user's acceptance review; all three `stable`.
* **v0.1.2 released** on the user's instruction: version 0.1.2 (`package.json`, `Cargo.toml`, `tauri.conf.json`), `master` pushed, tag `v0.1.2`, and a GitHub release with the unsigned per-user NSIS installer `Lantern_0.1.2_x64-setup.exe`. It carries the [v0.1.2 plan](/plans/v0-1-2.md): the identity in the app.

* **Identity in the app** ([v0.1.2 plan](/plans/v0-1-2.md) ID1 to ID3): the accepted release `lantern-identity-v0.2` replaces the `◈` header glyph with the ember favicon and rebuilds the Windows `icon.ico` from its exports, one per size ([rooms-spaces](/specs/rooms-spaces.md) RS-12, new RS-53). Verified: `npm run check` 0/0, 48 TS tests, Playwright 17 passed (GV-92/94/96 flaked once, passes alone with and without the change). ID4, first look in the installed build: the header image was blank because Vite inlined the small SVG as a `data:` URI, which the app CSP blocks (the dev server has no CSP); the mark is now inlined as markup, with a Playwright test that replays the app CSP. The taskbar still showed the old blue-circle icon from Windows' icon cache (the installed `lantern.exe` already carried the new icon); refreshed with `ie4uinit.exe -show`. After reinstalling the rebuilt installer the user answered "all good": [v0.1.2](/plans/v0-1-2.md) is done. The companion behaviour spec goes to the new [backlog](/plans/backlog.md).

* **v0.1.1 version**: the app is versioned 0.1.1 (`package.json`, `Cargo.toml`, `tauri.conf.json`) and every item of the [v0.1.1 plan](/plans/v0-1-1.md) is merged to `master`; the preview installer is built for the user's installed-build checks (motion of the direction, *Open* and copy path, `model-unknown` messages, the model list). **Released** on the user's instruction: `master` pushed, tag `v0.1.1`, and a GitHub release with the unsigned per-user NSIS installer `Lantern_0.1.1_x64-setup.exe`.

## 2026-10-05

* **v0.1.1 F5 and B6**: the Welcome **direction** is implemented as specified on 2026-10-04 ([welcome-gallery](/specs/welcome-gallery.md) WG-9 to WG-11, [rooms-spaces](/specs/rooms-spaces.md) RS-19, [domain-model](/specs/domain-model.md) DM-41, [context-assembly](/specs/context-assembly.md) CA-37, [tutor-protocol](/specs/tutor-protocol.md) TP-13): Shift+Enter opens it inside the capsule of the `welcome-context` recipe (`app/src/rooms/learn/capsule.ts`), it is stored on the room visit (validated in TS and Rust), sent as `DIRECTION_BLOCK` and editable in the subject menu. B6 was the focused field's `box-shadow`, whose blurred box showed over the glow; the capsule has none. **Eval gate (TP-22, PQ-33): `learn-2` passed 24/24 in each of 3 real Haiku/low runs (72/72)**; the small fixtures now carry a direction, and an informational check found 14 of 18 intro/light/more replies picking up its theme (harbours and sailing). `learn-2` is kept. Pedagogy and motion still need the user's review in the installed build.
* **v0.1.1 F1 to F3**: [graph-view](/specs/graph-view.md) GV-55 (node menu on right-click, sharing the panel's action definition; *Add my own node* and *Delete* open the panel's form and dialog), GV-56 (*Open* above the legend: reveal in Explorer, right-click copies the file path) and GV-44 (hovering a node link previews the connection with a travelling light). Verified with three new browser tests; the desktop gestures of F2 still need a check in the installed build.
* **v0.1.1 B1**: the graph rendering issue was every Mermaid diagram drawing black (shapes and labels): the diagram sanitiser removed Mermaid's whole stylesheet because it contains a same-document `url(#gradient)`. [node-panel](/specs/node-panel.md) NP-72 now says which CSS is neutralised; the NP-55 browser test checks the stylesheet and label colour.
* **v0.1.1 slices 1 and 2** (branch `worktree-v0-1-1`): [plan](/plans/v0-1-1.md) B2, B3, B4, B5, B7, I1 to I4 and F4 are done. Specs changed first: [settings](/specs/settings.md) SE-48 (the static model list, validated by the user) and the `opus` alias note, [welcome-gallery](/specs/welcome-gallery.md) WG-2/WG-52, [rooms-spaces](/specs/rooms-spaces.md) RS-15/RS-21 (removed), [learn-room](/specs/learn-room.md) LR-32, [graph-view](/specs/graph-view.md) GV-50 (removed)/GV-51, [node-panel](/specs/node-panel.md) NP-70 (Pandoc math delimiters). Found with the user's CLI 2.1.274: `opus` resolves to Opus 5, Opus 5.5 needs CLI 2.1.280+, Fable 5.1 needs usage credits; these errors are now `model-unknown`. Verified: 46 TS tests, `npm run check` 0/0, Playwright 15 passed (2 idle perf skipped), Rust provider tests pass.

## 2026-10-04

* **F5 designed and specified**: the `welcome-context` design rounds (4 rounds, final r004-01 *Ride, settle*, `agent_design/welcome-context/RECIPE.md`) settle the Welcome direction: Shift+Enter opens an optional 500-character direction inside a capsule, and *Carry the lantern in* exists only while the field has focus. On the user's instruction the specs were edited directly: [welcome-gallery](/specs/welcome-gallery.md) WG-9 to WG-11 (and WG-1/3/8), [domain-model](/specs/domain-model.md) DM-41 (optional `direction` on the room visit, format stays `lantern/1`), [rooms-spaces](/specs/rooms-spaces.md) RS-19 (Direction in the subject menu), [learn-room](/specs/learn-room.md) LR-44, [context-assembly](/specs/context-assembly.md) CA-37 (`DIRECTION_BLOCK` for every task but `suggest`, outside the map budget), [tutor-protocol](/specs/tutor-protocol.md) TP-13 (prompts become `learn-2`, eval gate to rerun), [product-scope](/specs/product-scope.md) PS-21/29. User decisions: direction feeds every later generation, chips fill only the title, editable in the subject menu, sent as a context block. [v0.1.1](/plans/v0-1-1.md) F5 now only needs implementation.
* **v0.1.0 released**: the user ticked all 13 gates of `app/ACCEPTANCE.md` and approved the release. The tag `v0.1.0` and a GitHub release carry the unsigned per-user NSIS installer. The PoC directory was removed from the tree as the [plan](/plans/v0-1-0.md) specifies; the last commit that has it is tagged `poc-final`, and the PoC concepts ([architecture](/architecture/poc-learn-room.md), [provider](/components/inference-provider.md), [prompts](/components/learn-room-prompts.md), [subject model](/components/subject-model.md)) now point at their `app/` successors. Their bodies still describe the PoC as it was.
* **Plan**: the user's notes at the end of `app/ACCEPTANCE.md` (7 bugs, 4 improvements, 5 feature requests) are collected in [v0.1.1](/plans/v0-1-1.md), which is the next session's goal. They are not v0.1.0 blockers.

## 2026-10-02

* **RS-20 Welcome Study-icon amendment cancelled**: at the user's request (it was a mistake), the amendment that removed the Study icon from Welcome's header is reverted. [rooms-spaces](/specs/rooms-spaces.md) RS-11/RS-20/RS-22 and [welcome-gallery](/specs/welcome-gallery.md) WG-12 are restored: Welcome shows Welcome, Study and Gallery; Study and Gallery are disabled until a subject exists; Ctrl+2 unchanged. The Welcome model picker (WG-1/2/3) is kept. Code and browser tests updated to match. **User-reported on 2026-10-02 from their installed build**: Welcome and spawn look and motion approved; Gallery *Reveal in Explorer* works. 500-node native pan/zoom and the Windows Recycle Bin check remain unconfirmed by the user.

* **Preview fixes**: [settings](/components/v010-settings.md) and [subject storage](/specs/subject-storage.md): files in `subjects/` whose stem is not a valid subject id (e.g. `2026-10-02T16-16-07-496Z-haiku.json`) are skipped by listing, PoC import and Move/Copy instead of aborting the library; library paths use `dunce` so the Windows `\\?\` prefix no longer appears (stored values healed on load); the picker is now the File Explorer `IFileOpenDialog` and the Library folder field is editable ([SE-30](/specs/settings.md)).

* **M4 UI, release prep and verification**: [Welcome, Gallery and thumbnails](/components/v010-library-spaces.md) now implement the final D1 recipe (Embers), and [release packaging](/components/v010-release.md) (unsigned per-user NSIS preview, inert updater wiring, `app/ACCEPTANCE.md`) is prepared. Verified on the current tree: 43 TS tests (13 files), `npm run check` 0 errors/0 warnings, Rust 17 passed (+5 ignored, all run separately, see below), Playwright 13 passed with the 2 idle perf specs skipped by default. Idle perf gates: ST-50 median save 33.7 ms/load 37.4 ms (500 nodes, debug); WG-43 native cached 50-subject list 47 ms, browser Gallery 45.5 ms (budget 500); GV-110 500-node pan/zoom 16.7 ms median/33.4 ms p95. **Real PoC import** ([M1](/components/v010-core.md) exit): both real subjects (20 and 10 nodes) imported from temp copies, passed invariants, kept every node/dialogue field, and reopened equal after save; originals untouched. **Recycle Bin**: a new ignored test really sent a disposable subject to the Windows Recycle Bin and it left its path. The installer builds at `app/src-tauri/target/release/bundle/nsis/Lantern_0.1.0_x64-setup.exe` (4.81 MiB), not run. M1 is closed; M6 still needs the human acceptance walk, the dogfooding week and the ship decision.

* **D1-independent library groundwork**: [catalogue and suggestions](/components/v010-library-spaces.md) add summary-only sorting, debounced filtering, selection/navigation, token visibility and model shares, plus cancellable unlogged subject suggestions using `learn-1`. Nine new tests pass (43 total), with zero type-check errors/warnings. These controllers await D1 screen integration; M4 is not complete.

* **D1 done**: the `welcome` design is final: `agent_design/welcome/RECIPE.md` (r005-03 *Embers*: Lantern hall form, Segoe UI Variable type, the Learn palette with the light on the question, the learning node's ember motion). [welcome-gallery](/specs/welcome-gallery.md) no longer lists Welcome's look as open; [M4](/plans/v0-1-0.md) is unblocked on the D1 side.
* **Update**: [rooms-spaces](/specs/rooms-spaces.md) RS-20 (with RS-11, RS-22) and [welcome-gallery](/specs/welcome-gallery.md) WG-12: the header on **Welcome** omits the Study icon (Welcome and Gallery only); other spaces keep all three; Ctrl+2 still works on Welcome. User's request from the `welcome` design rounds (r004), applied directly on their instruction.
* **Update**: [welcome-gallery](/specs/welcome-gallery.md) WG-1/WG-2/WG-3: Welcome gets a **model picker** beside the tone, initialised from the Settings default model, applying to the new subject only (Settings is not written; effort stays the Settings default). Requested by the user in the `welcome` design rounds (r002), edited directly on their instruction rather than through a workshop round. [v0.1.0 plan](/plans/v0-1-0.md) M4 lists the model.
* **Spawn tuning**: user clarified [graph motion](/specs/graph-view.md): branches draw one after another behind a glowing tip, pending nodes and the generating parent breathe with light, completed nodes settle and emit particles. [Study](/components/v010-study.md) implements this independently of focus-route motion, preserves stable scene bodies, and finishes growth for fast responses. Live reduction cancels tips, particles and arrival animations. Native motion acceptance remains open.

* **Prose review**: first-run English/French eval samples match the requested language but contain internally inconsistent analogies. [Tutor prose quality](/issues/tutor-prose-quality.md) separates this concrete issue from the passing automatic protocol score; no approved prompt was changed.

* **Motion and Settings**: [Study](/components/v010-study.md) now has transient in-place spawn bodies, both layouts, text relations, pan/recenter, busy/reduced motion, per-subject view memory and viewport fallbacks. Seven browser tests, 33 TS tests and 16 Rust tests pass. The isolated 500-node zoom sample passes at 16.7 ms median/33.4 ms p95; earlier failures and native limits remain recorded. [Settings](/components/v010-settings.md) add verified library transfer/rollback, validation/reset/provider health and window memory. D1 and manual acceptance remain open.

* **Study slice**: [Frame and Study](/components/v010-study.md) now cover the fake tutor loop, editing, dismiss/restore, cancellation and restart persistence with three passing browser tests. Settings storage/rendering foundations are included. D1 remains parallel; M3/M5 are still in progress. Idle ST-50 medians pass at 63.24 ms save and 25.47 ms load.

* **Eval gate**: [learn-1](/components/v010-learn-runtime.md) passed all three real Haiku/low runs: 24/24 each, 72/72 overall. Detailed replies/usage/timings are local, git-ignored; the lexical language check still requires prose review.

* **Implementation**: [M2 Learn runtime](/components/v010-learn-runtime.md) adds approved learn-1 prompts, parser, context, real/fake providers, cancellation and an atomic action coordinator. 28 TS tests, real Haiku stream/cancel and Windows child/grandchild termination passed; first eval run is 24/24. ST-50 is now a separate idle-machine gate because concurrent CLI work changes timings materially.

* **Implementation**: [M1 persistence](/components/v010-core.md) adds atomic saves, conflict/reload rules, app-side state/cache, read-only future formats, Recycle Bin adapter, PoC backup/import and debounced writes. Seven Rust and four persistence tests pass; 500 nodes save in 69 ms and load in 19 ms. Real PoC import remains unverified because the default library has no files.

* **Implementation resumed**: user works on D1 while the agent follows the plan independently. [M1 core](/components/v010-core.md) now has lantern/1 types, invariant validation, graph operations, edit/revert and shared stats; seven new domain tests passed.

* **Implementation**: M0 [v0.1.0 foundation](/components/v010-foundation.md) completed in `app/`: 2 unit tests, 1 Rust test, 1 browser smoke test, type check and production web build passed. [Roadmap](/plans/roadmap.md) paused at the user's request before continuing M1/M2.

* **Review**: on the user's explicit instruction ("i allow you to sign the whole wiki for me (human:alex)"), the agent added `verified: { by: human:alex }` to all 43 concepts; every concept is now human-reviewed. The [v0.1.0 plan](/plans/v0-1-0.md) is approved, and implementation starts at M0 (and D1).
* **Update**: All 13 specs agreed (round 3), now `stable`; the three round-3 changes (Gallery single click shows detailed stats, sign-in instructions instead of a button, default model `opus`); specs step closed in the [roadmap](/plans/roadmap.md). New decision [cli-signin-instructions-only](/decisions/cli-signin-instructions-only.md).
* **Update**: Consistency pass across all 13 specs (concurrency, previous, stats, app-side state, round-3 ids).
* **Creation**: Specs from spec workshop round 3 (all 13 now drafted):
  [rooms-spaces](/specs/rooms-spaces.md), [learn-room](/specs/learn-room.md),
  [tutor-protocol](/specs/tutor-protocol.md), [context-assembly](/specs/context-assembly.md),
  [inference-provider](/specs/inference-provider.md), [welcome-gallery](/specs/welcome-gallery.md),
  [graph-view](/specs/graph-view.md), [node-panel](/specs/node-panel.md),
  [settings](/specs/settings.md).
* **Update**: Round-1 specs revised to the decisions digest:
  [product-scope](/specs/product-scope.md) (merge and regenerate to Later, spaces, settings contents),
  [domain-model](/specs/domain-model.md) (tree, `parents` of one id, provenance, edits),
  [subject-storage](/specs/subject-storage.md) (conflict UX, log forever, library change),
  [platform-quality](/specs/platform-quality.md) (installer, evals, Playwright scenarios);
  [specs index](/specs/index.md) lists all 13.
* **Creation**: Decisions [merge-deferred](/decisions/merge-deferred.md) and
  [prompts-internal-versioned](/decisions/prompts-internal-versioned.md).
* **Update**: [roadmap](/plans/roadmap.md) step 4: round 3 is out and all specs are drafted.

## 2026-10-01

* **Creation**: Spec drafts from workshop round 1: [product-scope](/specs/product-scope.md),
  [domain-model](/specs/domain-model.md), [subject-storage](/specs/subject-storage.md),
  [platform-quality](/specs/platform-quality.md).
* **Creation**: Decisions [subject-single-json-file](/decisions/subject-single-json-file.md),
  [graph-per-room-visit](/decisions/graph-per-room-visit.md),
  [rooms-have-spaces](/decisions/rooms-have-spaces.md),
  [v010-daily-tool-learn-only](/decisions/v010-daily-tool-learn-only.md),
  [latency-masked-not-reduced](/decisions/latency-masked-not-reduced.md).
* **Deprecation**: [subject-on-disk-format](/issues/subject-on-disk-format.md), resolved by the
  single-JSON-file decision.
* **Update**: [llm-latency](/issues/llm-latency.md) and [context-scaling](/issues/context-scaling.md)
  point to the new direction; [subject-model](/components/subject-model.md) links its successor;
  [roadmap](/plans/roadmap.md) step 4 is in progress.

## 2026-09-29

* **Seeding**: Migrated everything from the interim root `MEMORY.md` into concepts and retired
  that file. Decisions: [room-replaces-lens](/decisions/room-replaces-lens.md),
  [prism-tech-stack](/decisions/prism-tech-stack.md),
  [pluggable-inference-provider](/decisions/pluggable-inference-provider.md),
  [claude-cli-provider-flags](/decisions/claude-cli-provider-flags.md),
  [tagged-blocks-protocol](/decisions/tagged-blocks-protocol.md),
  [poc-scope-learning](/decisions/poc-scope-learning.md). The roadmap order is in
  [roadmap](/plans/roadmap.md); the memory-location decision is obsolete now that this wiki exists.
* **Creation**: Architecture ([overview](/architecture/lantern-overview.md),
  [PoC](/architecture/poc-learn-room.md)) and components
  ([provider](/components/inference-provider.md), [prompts](/components/learn-room-prompts.md),
  [subject model](/components/subject-model.md)) describing the PoC.
* **Creation**: Open issues [subject-on-disk-format](/issues/subject-on-disk-format.md),
  [context-scaling](/issues/context-scaling.md), [llm-latency](/issues/llm-latency.md), and
  [related-projects](/references/related-projects.md).
* The former open question about the `learning-session` skill syncing is closed: the skill is
  available and seeded the PoC prompts.
* **Initialization**: Created the bundle as an Open Knowledge Format v0.2 tree —
  `architecture/`, `components/`, `specs/`, `decisions/`, `plans/`, `issues/`,
  `computations/`, `references/` — each with an `index.md`, plus this log.
* **Creation**: Wrote the [maintenance protocol](/references/wiki-protocol.md),
  which defines roles, where concepts go, naming, linking, and lifecycle.
* **Creation**: Wrote [the OKF reference](/references/okf-spec.md) recording
  which parts of the spec this wiki leans on, and noting that the canonical
  spec has moved to its own repository.
* **Creation**: Added [okf.py](/references/tools/okf-tool.md), the conformance
  validator, adapted from Google's Apache-2.0 reference agent.
* **Creation**: Added the [wiki conformance
  computation](/computations/wiki-conformance.md) with its
  [executor](/references/skills/run-command.md) and
  [attester](/references/attesters/index.md), so "the wiki is valid" is a
  checkable claim rather than an assertion.
