---
type: Spec
title: v0.1.0 product scope
description: What Lantern v0.1.0 is, what is in and out, what must be kept from the PoC, and the acceptance scenarios.
tags: [scope, v0.1.0, acceptance]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-04T19:30:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Source: spec workshop rounds 1–3 (2026-10-01/02). Agreed with the user 2026-10-02 (q-r3-review).

# Purpose

v0.1.0 is the user's **daily tool**: a Learn room used for real, every day
([decision](/decisions/v010-daily-tool-learn-only.md)). It is built modular from the start: the
app will have several rooms, not all about learning and possibly with new mechanisms. Reusable
components are a requirement, not a nicety.

# Requirements

## Rooms and spaces

- **PS-1** The app MUST ship exactly one room in v0.1.0: Learn. *(Amended 2026-10-12, round 5, for v0.2.0.)* v0.2.0 adds the second room,
  **Choose** ([choose-room](/specs/choose-room.md)), after a first release that makes the frame
  room-generic with Learn unchanged. Rooms planned after it: Think, Explore, Interview ([backlog](/plans/backlog.md)).
- **PS-2** Rooms MUST exist in the data model and in the UI frame; a Room definition supplies the AI role and prompts, node kinds, states, actions, spaces and settings sections.
- **PS-3** Room-specific logic MUST NOT live in the app core; adding a room MUST NOT require changing the storage format ([domain-model](/specs/domain-model.md)).
- **PS-4** A room MUST own a set of spaces ([decision](/decisions/rooms-have-spaces.md), [rooms-spaces](/specs/rooms-spaces.md)). Learn MUST have three: **Welcome** (start a subject or continue one of the 3 most recent), **Study** (the graph and the reading panel) and **Gallery** (browse all subjects with stats). Spaces belong to the room; there is no app-level home in v0.1.0. *(Amended 2026-10-12, round 5, for v0.2.0.)* Choose has Welcome, its graph space, Compare and Gallery; every room has its own Welcome and Gallery ([decision](/decisions/spaces-per-room-no-home.md)).
- **PS-5** UI parts SHOULD be reusable components, not Learn-specific code, wherever another room could use them.
- **PS-6** The app MUST open on the **last used room's Welcome**. The Lantern mark in the header leads to the current room's Welcome.
- **PS-7** Each room MUST have its own accent (its own lantern); frame, typography and structure are shared. Learn keeps the amber lantern.

## In v0.1.0

- **PS-10** Subject library: Welcome and Gallery ([welcome-gallery](/specs/welcome-gallery.md)).
- **PS-11** Cross-links between nodes as markdown text links `[label](node:<id>)`, clickable in the panel and drawn as faint dotted lines in the graph, toggled from the legend.
- **PS-12** Add my own node; dismiss and restore an open node; request more options (3 at a time, never replacing existing ones).
- **PS-13** Edit (title, hook, explanation, tutor turns) and delete nodes.
- **PS-14** Cancel a running generation (the Cancel button or Esc).
- **PS-15** Adaptive context: the whole map within a 12k-token budget, neighbourhood plus all titles beyond ([context-assembly](/specs/context-assembly.md), [context-scaling](/issues/context-scaling.md)).
- **PS-16** Model and effort setting, per subject, changeable mid-session, with app defaults in Settings.
- **PS-17** Math, diagrams and highlighted code in the reading panel (KaTeX, Mermaid, syntax highlighting).
- **PS-18** Windows installer ([platform-quality](/specs/platform-quality.md)).
- **PS-19** Keyboard navigation of the graph and panel, with one canonical shortcut table ([graph-view](/specs/graph-view.md) GV-76).
- **PS-20** A settings panel with General, Provider, Learn room (submenu) and Appearance sections ([settings](/specs/settings.md)). Its contents are known: library folder, display name, provider status and test, default model and effort, default tone, context budget, reduce-motion override, show token stats.
- **PS-21** Selectable tutor tone (ELI5, Curious, Student, Engineer, Expert, or custom text), per subject, with a room default. From v0.1.1 a subject also has an optional **direction**, the learner's words on where it should start or head, given on Welcome and changed in the subject menu ([welcome-gallery](/specs/welcome-gallery.md) WG-9).
- **PS-22** ~~Ctrl+click several nodes to merge them into a new node.~~ Withdrawn from v0.1.0: merge is Later ([decision](/decisions/merge-deferred.md)). v0.1.0 is a tree with text links.
- **PS-23** Node provenance (model and effort that wrote it, edited-by marks) and per-generation usage (tokens, time, cost) recorded in the generation log; the UI shows tokens and time, no currency.
- **PS-24** Resizable reading panel: draggable divider, double-click resets to 44%, either side collapsible, remembered app-wide.
- **PS-25** A welcoming home: the Welcome space.
- **PS-26** Select text in an explanation or dialogue to *Ask about this* or *Make it a node*.
- **PS-27** A mandatory legend overlay in the graph (collapsible, never removable).
- **PS-28** Welcome is a **design task**: its look is designed in `agent_design` as a component before it is implemented; the spec fixes behaviour and content only.
- **PS-29** Prompts are app-internal and versioned ([decision](/decisions/prompts-internal-versioned.md)); the user-facing controls are tone, model, effort and (v0.1.1) the subject's direction.

## Later (not in v0.1.0)

Merge (Ctrl+click, several parents) (regenerating an explanation has landed as *Rewrite explanation*, [learn-room](/specs/learn-room.md) LR-45),
parallel generation, Anthropic API, local and other providers (with a security focus when they
come), search, export (for example the graph as an OKF bundle), undo and history, spaced review,
learner profile, bring-your-own material, the Think, Explore and Interview rooms, an app-level home, one subject in several rooms with an *Open in Learn* handoff (q-r5-cross-room),
auto-update UI, light theme, French UI. *Lantern opens the Claude Code sign-in for you* is also Later: v0.1.0 only shows step-by-step instructions ([decision](/decisions/cli-signin-instructions-only.md)). Options-first protocol, a cheaper model for cheap tasks
and summary calls are also later ([decision](/decisions/latency-masked-not-reduced.md)). Never:
nothing yet.

## Latency

- **PS-30** Latency is not a constraint: waits over about 10 s MUST be acceptable because text streams and animation masks the wait.
- **PS-32** One generation runs at a time per subject (per room visit) in v0.1.0. While it runs the user can browse and read everything but cannot start another generation: the start controls are disabled, with a tooltip saying why. The provider contract still allows concurrent calls, so parallel generation (Later) needs no provider change ([learn-room](/specs/learn-room.md) LR-40).
- **PS-31** While a node is being lit, its children MUST appear to spawn and grow from the parent as neutral placeholders; titles fill in when known (behaviour in [graph-view](/specs/graph-view.md)).

## Must keep from the PoC

- **PS-40** The colour theme and the final learning-node design r008-02 "Forward embers" (recipe: `/agent_design/learningnode/RECIPE.md` in the repo).
- **PS-41** Subtle animation and details such as the travelling light.
- **PS-42** A calm "warm light in a peaceful place" feel with no distraction. Other rooms MAY have their own lantern and feel; the app MUST stay coherent.
- **PS-43** The 3-teaser rhythm.
- **PS-44** Stats MUST be accessible but secondary: compact in the header (*12 lit · 4 understood · 9 dark*), token total on hover.
- **PS-45** A legend MUST be present (mandatory).
- **PS-46** A header with, left to right: Lantern mark, room chip (a label in v0.1.0, the switcher later), space navigation, subject title, compact stats, settings gear.
- **PS-47** A right-hand reading panel with mandatory markdown rendering and streaming text.

## Quality

- **PS-50** Prompt evals on Haiku MUST pass at **95% or better** of their cases before a prompt version ships. Details in [platform-quality](/specs/platform-quality.md).

# Acceptance

User's words (lightly edited): "I can start a subject, learn it over several days across app restarts, and the graph shows honestly what I know, with no data loss; waits over ~10 s are fine because the animation carries them; I never need to open a terminal; at least a minimal settings panel lets me customise the app."

| Id | Scenario | Passes when |
|---|---|---|
| AC-1 | Start a subject from Welcome | A root node exists and the tutor's introduction streams in. |
| AC-2 | Learn over several days | After closing and reopening the app on separate days, the app opens on Welcome, the subject is in the 3 recent cards, and the graph is identical. |
| AC-3 | Honest graph | Every node shows its real state; a node is `understood` only if the tutor confirmed it (demonstrated) or the user declared it (self), and the node records which. |
| AC-4 | No data loss | Killing the app at any moment loses at most the last unsaved ~300 ms of edits ([subject-storage](/specs/subject-storage.md)). |
| AC-5 | Long waits | A 25 s generation shows streaming text and spawn animation throughout, and can be cancelled (Cancel button or Esc). |
| AC-6 | No terminal in daily use | Install, first run, settings, model choice and library location are all done from the UI; the one-time Claude Code sign-in follows Lantern's instructions. |
| AC-7 | Settings | The settings panel changes at least tone, model and library folder, and the change takes effect without reinstalling. |

# Open

None for v0.1.0.

Related: [domain-model](/specs/domain-model.md), [subject-storage](/specs/subject-storage.md), [learn-room](/specs/learn-room.md), [rooms-spaces](/specs/rooms-spaces.md), [settings](/specs/settings.md), [platform-quality](/specs/platform-quality.md).
