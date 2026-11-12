---
type: Decision
title: Prepared subjects replay instead of generating
description: A Learn subject can ship with its content already written; lighting a prepared node replays it with no model call, nodes appear as their parent lights, and progress can be reset and restored. Plus dead ends, collapsible branches and collapsible solutions.
tags: [learn-room, replay, prepared-content, graph, format]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-11-12T12:00:00Z }
---

Decided 2026-11-12 with the user, for an LLM curriculum (about 150 to 200 nodes, 9 modules) written
offline and shipped as a `lantern/2` Learn subject. Specs: [learn-room](/specs/learn-room.md) LR-90
to LR-119, [graph-view](/specs/graph-view.md) GV-120 to GV-139, [node-panel](/specs/node-panel.md)
NP-64 and NP-75 to NP-78, [domain-model](/specs/domain-model.md) DM-17a and DM-70 to DM-77. Plan:
[prepared subjects](/plans/prepared-subjects.md).

# Options

| Question | Option | Verdict |
|---|---|---|
| Where the written content lives | A second file (course) beside the learner's file (progress) | Rejected: two files to keep in step, and a new format. |
| | **One file**: content and progress together | **Chosen.** An `open` node with non-empty content is *prepared*; no new field, no format change. |
| How lighting a prepared node feels | Show it at once | Rejected: the graph would stop feeling alive. |
| | Replay behind the provider seam with a model-like wait, as the [web demo](/decisions/web-demo-prepared-answers.md) | Rejected: a fake wait is dishonest outside a demo. |
| | **Replay through the real streaming and spawn animation, about 1 s, no wait** | **Chosen.** Click skips; reduced motion shows it at once. |
| Is a replay logged | A record with zero usage | Rejected: generation counts and stats would lie. |
| | **No record** | **Chosen.** A replay is not an LLM call. |
| What the learner sees of a prepared subject | Everything | Rejected: 200 dark nodes at once is a wall. |
| | **A node shows when its parent is lit or understood** | **Chosen**; the root always shows. |
| Collapse state | In the subject file | Rejected: it is a view, not progress; it would make saves, undo steps and conflicts for a fold. |
| | **App-side UI state, per subject** | **Chosen** (GV-136). |
| Solutions in the text | Raw HTML on in markdown-it | Rejected: every tag would render, and `List<T>` would lose its `<T>` (TP-32). |
| | **A dedicated `<details>` block rule**, HTML stays off | **Chosen** (NP-75). |

# Consequences

- LR-39 (open nodes are leaves) is relaxed: an open node may already hold content and children.
  Generation and learner actions still add children only under lit or understood nodes.
- *Replay from the start* is the first way to make a lit node dark again. It keeps a snapshot,
  so it can be undone across restarts with *Restore progress*.
- Older app versions do not know prepared nodes: they show the whole tree and *Light it up* would
  call the model and overwrite the prepared text. The format stays `lantern/2` anyway (the user,
  2026-11-12); prepared subjects need this version.
- Nothing requires a model author's `generationId` to match a log record, so authored content
  needs no special marker (DM-17a).
- The visibility rule and the replay streamer live in the shared core so Choose can use them
  later; only Learn uses them now.
