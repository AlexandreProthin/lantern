---
type: Reference
title: Related projects and skills
description: Prism, the make-me-think and make-me-learn skills, and the OKF wiki skill, and what Lantern takes from each.
tags: [prism, skills, okf]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

| Name | Where | Relation to Lantern |
|---|---|---|
| **Prism** | `C:\Users\alexp\Desktop\prism`, github.com/AlexandreProthin/prism | Review cockpit for AI coding output. Lantern reuses its [stack](/decisions/prism-tech-stack.md), graph and panel patterns. Its *lens* is the ancestor of the *room* ([room-replaces-lens](/decisions/room-replaces-lens.md)); see `agent_wiki/architecture/lens-model.md` there. It also reads OKF bundles as its wiki lens. |
| **make me learn** | the `learning-session` claude.ai skill | Seed of the Learn room and the PoC prompts ([learn-room-prompts](/components/learn-room-prompts.md)). |
| **make me think** | the `socratic-session` skill | Seed of the Think room. |
| **OKF wiki** | the `okf-wiki` skill, `~/.claude/skills/okf-wiki` | Format of this wiki, and a candidate for the subject format ([subject-on-disk-format](/issues/subject-on-disk-format.md)). |
