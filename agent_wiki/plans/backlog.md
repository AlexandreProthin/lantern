---
type: Plan
title: Backlog
description: Agreed future work with no session or version assigned yet; each entry says where it starts and what it needs.
tags: [plan, backlog]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-07T00:30:00Z }
---

Entries move out of here into a versioned plan when the user schedules them. Newest first.

# Future rooms: Think, Explore, Interview

- **Added:** 2026-10-12, on the user's request, when the Choose room was picked as the second room.
- **What:** three rooms after Choose, no order fixed yet:
  - **Think**: "make me think", the user does the reasoning and Lantern is the foil (product-scope
    already lists *the Think room* as Later).
  - **Explore**: close to Learn but without the learning angle; what it is exactly is still to be
    determined.
  - **Interview**: resume, skills and experience, to prepare a job interview and find job
    opportunities.
- **Needs:** each one a spec workshop round, on top of the room-generic frame the Choose room brings.

# Export a subject

- **Added:** 2026-10-07, on the user's request.
- **What:** take a subject's graph out of Lantern (explanations, edits, dialogue) to reuse it elsewhere.
- **Open question first:** the form is **not decided**: one file (Markdown, JSON), an OKF bundle (one
  concept per node, the scope's example in [product-scope](/specs/product-scope.md) *Later*), or
  something else. The user wants this determined properly before any implementation.
- **How:** a spec workshop round on the format and its readers, then a spec, then implementation.

# Regenerate an explanation

- **Added:** 2026-10-07, on the user's request.
- **What:** one action on a lit node that asks the tutor to rewrite its explanation; the old text
  becomes the previous version ([domain-model](/specs/domain-model.md) DM-16 already stores one).
- **Needs:** a new task in [tutor-protocol](/specs/tutor-protocol.md), so a new prompt version and the
  three-run eval gate (PQ-33); the action in the panel and node menu ([graph-view](/specs/graph-view.md) GV-55).
  Relates to [tutor-prose-quality](/issues/tutor-prose-quality.md). Listed as *Later* in product-scope.

# Cheaper model for cheap tasks

- **Added:** 2026-10-07, on the user's request.
- **What:** run the cheap tasks (check-answer replies, subject suggestions) on a small model such as
  Haiku and keep the subject's model for explanations.
- **Needs:** a setting (on by default or not, which model), the per-task model in the call log
  (DM-30 already records `model`), and the eval gate on the small model. One of the levers of
  [latency-masked-not-reduced](/decisions/latency-masked-not-reduced.md) and
  [llm-latency](/issues/llm-latency.md).

# Companion behaviour spec

- **Added:** 2026-10-06, on the user's request ("point 2 in a future session add it to the backlog").
- **What:** specify how the identity's companion behaves in the app. The release
  `lantern-identity-v0.2` gives it six finite gestures (rest, curiosity, a few steps, suspension,
  heat and lift, descent and landing) but defines no behaviour.
- **Open questions:** where it lives in each room and space; what triggers each gesture (only
  explicit user actions so far); how it is hidden and how it comes back (contract clause C09: always
  available, can be forgotten, never imposes itself); whether there is any idle animation (currently
  forbidden until agreed); how gestures chain from arbitrary states; calm during Learn (C10);
  reduced motion.
- **Inputs:** `agent_identity/projects/lantern/final/lantern-identity-v0.2/` (IDENTITY.md motion rules,
  IMPLEMENTATION.md runtime API), the identity contract `agent_identity/projects/lantern/CONTRACT-v2.md`,
  [rooms-spaces](/specs/rooms-spaces.md), [learn-room](/specs/learn-room.md).
- **How:** a spec workshop session (`agent_design/tool/specs_work/`), after the mark is live in the app
  ([v0.1.2](/plans/v0-1-2.md)).
- **Produces:** a new spec (likely `specs/companion.md`) and the deferred identity tests on idle and
  transition policy.
