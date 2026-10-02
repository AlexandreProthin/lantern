# Wiki Update Log

## 2026-10-02

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
