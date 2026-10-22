---
type: Architecture
title: Lantern overview
description: "The shape of Lantern at v0.5.0: subjects visit rooms, each room holds a graph, a panel and an LLM provider, inside one frame."
tags: [overview, rooms, subject, graph]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-18T12:00:00Z }
resource: /README.md
---

Lantern is a desktop workspace (Windows, Tauri 2 and Svelte 5) for thinking with an AI. The conversation
feeds a **graph of ideas** that persists, instead of a chat log that scrolls away. The product pitch is in
the `README.md` at the repo root; this concept holds the structure. It was rewritten on 2026-10-18 from
the draft written before the PoC; the first version is in git history.

# Shape

```
subject        what you're working through ("how TCP congestion control works")
  └── room visit   where you've taken it (Learn · Choose · …)
        ├── graph   the structure built up so far (nodes, edges, states)
        ├── panel   reads and works one node: explanation, dialogue, notes
        └── llm     an inference provider driven by the room's prompts + context
```

- The **subject belongs to the user**, not to a room. It *visits* rooms, and the same subject
  can be taken into several, each visit with its own graph ([graph-per-room-visit](/decisions/graph-per-room-visit.md),
  [room-replaces-lens](/decisions/room-replaces-lens.md)).
- A **room** sets the AI's role, what nodes and edges mean, and what "progress" looks like. Each room has
  spaces ([rooms-have-spaces](/decisions/rooms-have-spaces.md), [spaces-per-room-no-home](/decisions/spaces-per-room-no-home.md)).
- The **graph** is what stays; the conversation feeds it, through [tagged blocks](/decisions/tagged-blocks-protocol.md).
- The **LLM** is behind a [provider contract](/specs/inference-provider.md): the Claude Code CLI, or since
  v0.5.0 an OpenAI-compatible endpoint (Ollama and other local servers, NVIDIA) chosen per model
  ([custom-endpoints](/specs/custom-endpoints.md)).
- One **frame** (top bar, settings, galleries, updates, Amber) hosts every room
  ([rooms-spaces](/specs/rooms-spaces.md)). Amber, the companion, lives in the frame
  ([companion](/specs/companion.md)).
- A subject is one JSON file in the library folder, format `lantern/2` since v0.2.0
  ([subject-storage](/specs/subject-storage.md), [format-lantern-2](/decisions/format-lantern-2.md)).

# Rooms

| Room | State | AI acts as | Graph holds | Spec |
|---|---|---|---|---|
| Learn | shipped (v0.1.0) | tutor | concepts, prerequisites, what you have shown you understand | [learn-room](/specs/learn-room.md) |
| Choose | shipped (v0.3.0) | guide to a decision | needs, criteria, shortlist, sources | [choose-room](/specs/choose-room.md), [choose-protocol](/specs/choose-protocol.md) |
| Think | candidate | Socratic foil | positions, objections, replies, your own moves | [backlog](/plans/backlog.md) |
| Explore | candidate, undefined | guide | branches, related territories, leads | [backlog](/plans/backlog.md) |
| Interview | candidate | not defined | resume, skills, experience, openings | [backlog](/plans/backlog.md) |

The registration order is the one list in `app/src/rooms/index.ts` (Learn, then Choose); the web demo
build registers Learn alone ([web demo](/components/web-demo/index.md)).

# Where the code lives

| Path (under `app/`) | Holds |
|---|---|
| `src/core/` | Domain model, graph, layout, model ids |
| `src/frame/` | The shell: top bar, settings, endpoints, provider routing, persistence, updates, Amber (`frame/amber/`) |
| `src/rooms/learn/`, `src/rooms/choose/` | One folder per room: definition, prompts, protocol parser, context, session, views |
| `src/ui/` | Shared pieces: graph canvas, panel, markdown, pickers, strings |
| `src/demo/` | The web demo's scripted tutor |
| `src-tauri/src/` | Rust: library storage, provider (`provider/`: CLI, endpoints, keys), updates, commands |

# Not settled

See [issues/](/issues/index.md): prompt and context management, tutor prose quality, latency. Further
rooms and the other open work are in the [backlog](/plans/backlog.md).
