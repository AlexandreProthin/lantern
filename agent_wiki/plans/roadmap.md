---
type: Plan
title: Roadmap
description: The ordered steps from README to the first release, and where the project is on them.
tags: [roadmap, milestones]
status: stable
stale_after: 2026-12-31T00:00:00Z
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
---

Order decided 2026-09-27: README → PoC → OKF wiki → specs + v0.1.0 plan.

| # | Step | State |
|---|---|---|
| 1 | README | done |
| 2 | Proof of concept, Learn room ([architecture](/architecture/poc-learn-room.md)) | done, 2026-09-28; tried, "very close" |
| 3 | Project wiki (this bundle) | done, 2026-09-29; replaces the interim `MEMORY.md` |
| 4 | Specs + v0.1.0 plan | next |

# Inputs to the specs

- What is still off in the PoC (the user's feedback, to be recorded as issues).
- The three open topics from the README: prompt and context management
  ([context-scaling](/issues/context-scaling.md)), saving format
  ([subject-on-disk-format](/issues/subject-on-disk-format.md)), and the room system
  ([overview](/architecture/lantern-overview.md)).
