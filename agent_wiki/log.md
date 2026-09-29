# Wiki Update Log

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
