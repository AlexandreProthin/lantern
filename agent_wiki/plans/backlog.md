---
type: Plan
title: Backlog
description: Agreed future work with no session or version assigned yet; each entry says where it starts and what it needs.
tags: [plan, backlog]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-07T00:30:00Z }
---

Entries move out of here into a versioned plan when the user schedules them. Newest first.

# Lantern on the network: the later pieces

- **Added:** 2026-10-22, from the [serve over the network plan](serve-over-network.md).
- **Tailscale**: HTTPS with a trusted certificate (MagicDNS) and access away from home, with no port
  forwarding. Removes the self-signed warning and allows installing Lantern as an app (PWA, service worker).
- **Headless server (Docker)**: the same server as a standalone binary with the library on a volume,
  for a machine that runs without the desktop app. Needs the Claude Code CLI signed in inside the
  container (or endpoints only), Ollama reached through `host.docker.internal`, and updates by image.

# Custom endpoints: the later pieces

- **Added:** 2026-10-17, from spec workshop rounds 10–11 ([custom-endpoints](/specs/custom-endpoints.md) CE-3).
- **Codex CLI provider** (CE-58): a second CLI provider on a ChatGPT plan, with its own detection,
  stream, errors and fixtures; it can also run Choose's research (CE-55). Its own version, scheduled
  once the user has a Codex plan to test with.
- **Lantern's own web tools** (CE-55): a search API with its own key, page fetching in Rust and a
  tool-calling loop, so Choose's research works on any model. The user wants it eventually; it needs
  its own spec round.
- **Check this model** (CE-60): the rooms' code-checked eval cases run from Settings on a pinned model,
  a score per room.
- **Protocol repair call** (CE-57): only if endpoint models often skip the options block.
- **More cloud presets** (OpenRouter, Groq, Mistral, DeepSeek, Together) and **the Anthropic API with a
  key** (Claude without the CLI, billed per token).
- Models per task: the *Cheaper model for cheap tasks* entry below.

# Local models for Amber (experiment)

- **Added:** 2026-10-17, on the user's request, after the [companion](/specs/companion.md) spec was agreed.
- **Why:** token efficiency first (the user's priority), then latency, then giving Amber a little
  natural language of its own. The user wants to experiment with this.
- **Where:** a dedicated feature branch, after Amber ships; nothing here changes the agreed spec until
  the experiment says so.
- **Before starting:** the user explains **jev/laya** (the classification models they have in mind);
  do not guess what they are.
- **Context:** Ask Amber is one Haiku 5.5 call that names its category (app, subject, general) before
  answering (CO-42). Most of the wait is the CLI start and the time to the first word, so a local
  classifier alone saves tokens more than time.
- **Steps, in order:**
  1. **Local answers for app questions**: embeddings over the tips, guide lines and shortcut table;
     a good match is answered locally (instant, free, offline), otherwise Haiku. Biggest win.
  2. **Local classification** before the call, so the Haiku call carries only its category's context
     (CO-43 sends everything today).
  3. **A small generative model** for Amber's own lines (varied greetings and waiting lines), weighed
     against installer size (roughly 300 MB to 1 GB), CPU and RAM. Not for facts about the app.
- **Measure:** tokens per Ask Amber question and time to the first word, before and after; installer
  size; the classification accuracy on Amber's eval cases (CO-48).
- **Would amend:** CO-40 (only Ask Amber calls a model), CO-43 (context per category), the evals.

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

- **Status:** specced 2026-10-16 in spec workshop rounds 8–9: [companion](/specs/companion.md), agreed
  by the user the same day. The companion is named **Amber**; the user put every feature in the first version. Planned
  2026-10-17 as [v0.4.0](/plans/v0-4-0.md).
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
