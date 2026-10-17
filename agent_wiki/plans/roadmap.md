---
type: Plan
title: Roadmap
description: The ordered steps from README through each release, and where the project is on them.
tags: [roadmap, milestones]
status: stable
stale_after: 2026-12-31T00:00:00Z
generated: { by: claude-code/opus-5.5, at: 2026-10-17T12:00:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Order decided 2026-09-27: README → PoC → OKF wiki → specs + v0.1.0 plan.

| # | Step | State |
|---|---|---|
| 1 | README | done |
| 2 | Proof of concept, Learn room ([architecture](/architecture/poc-learn-room.md)) | done, 2026-09-28; tried, "very close" |
| 3 | Project wiki (this bundle) | done, 2026-09-29; replaces the interim `MEMORY.md` |
| 4 | Specs | done, 2026-10-02 (13 specs agreed; workshop at `agent_design/tool/specs_work/`) |
| 5 | v0.1.0 implementation, plan in [v0-1-0](/plans/v0-1-0.md) | released 2026-10-04; PoC removed (tag `poc-final`) |
| 6 | v0.1.1, plan in [v0-1-1](/plans/v0-1-1.md) | released 2026-10-06 |
| 7 | v0.1.2, plan in [v0-1-2](/plans/v0-1-2.md): the identity in the app | released 2026-10-06; later work in the [backlog](/plans/backlog.md) |
| 8 | v0.2.0 plan, in [v0-2-0](/plans/v0-2-0.md): the second room, Choose | done: Part A released as v0.2.0 2026-10-14; Part B (Choose) released as **v0.3.0** 2026-10-16 |
| 9 | v0.4.0, plan in [v0-4-0](/plans/v0-4-0.md): Amber, the companion, with the new top bar built alongside (`claude/lantern-top-bar`) | released 2026-10-17 |
| 10 | Custom endpoints: models beyond Claude Code, local servers first (Ollama, llama.cpp), then cloud APIs (NVIDIA first); spec [custom-endpoints](/specs/custom-endpoints.md) | spec agreed 2026-10-17; local version planned in [custom-endpoints-local](/plans/custom-endpoints-local.md), worktree `worktree-lantern-custom-endpoints`. One version for local, then one for cloud; numbers not fixed, and before releasing local the agent asks whether to wait and ship both in one bump (CE-5). Work starts in a worktree, then moves to a feature branch when the user judges it good enough; the user decides the merge (CE-6) |
| 11 | Next | not scheduled; candidates in the [backlog](/plans/backlog.md): the Think, Explore and Interview rooms, export a subject, regenerate an explanation |

# Inputs to the specs

- What is still off in the PoC (the user's feedback, to be recorded as issues).
- The three open topics from the README: prompt and context management
  ([context-scaling](/issues/context-scaling.md)), saving format
  ([subject-on-disk-format](/issues/subject-on-disk-format.md)), and the room system
  ([overview](/architecture/lantern-overview.md)).

# Specs (rounds 1–3, 2026-10-01/02)

All 13 are listed with one line each in [specs/index](/specs/index.md): product-scope, rooms-spaces,
domain-model, learn-room, tutor-protocol, context-assembly, inference-provider, subject-storage,
welcome-gallery, graph-view, node-panel, settings, platform-quality. All are `stable`, agreed with the user on 2026-10-02. Next: the v0.1.0 implementation, following its plan.
