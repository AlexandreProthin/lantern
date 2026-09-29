---
type: Architecture
title: Lantern overview
description: "The intended shape of Lantern: subjects visit rooms, each room holds a graph, a panel and an LLM provider."
tags: [overview, rooms, subject, graph]
status: draft
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:30:00Z }
resource: /README.md
---

Lantern is a desktop workspace for thinking with an AI. The conversation feeds a **graph of
ideas** that persists, instead of a chat log that scrolls away. The product pitch and the
list of rooms are in the `README.md` at the repo root; this concept holds the structure.

# Shape

```
subject        what you're working through ("how TCP congestion control works")
  └── room     where you've taken it (learn · think · explore · decide · …)
        ├── graph   the structure built up so far (nodes, edges, states)
        ├── panel   reads and works one node: explanation, dialogue, notes
        └── llm     an inference provider driven by the room's prompts + context
```

- The **subject belongs to the user**, not to a room. It *visits* rooms, and the same subject
  can be taken into several. See [room-replaces-lens](/decisions/room-replaces-lens.md).
- A **room** sets the AI's role, what nodes and edges mean, and what "progress" looks like.
- The **graph** is what stays; the conversation feeds it. In the Learn room the mechanism is
  [tagged blocks](/decisions/tagged-blocks-protocol.md).
- The **LLM** is behind a [provider trait](/decisions/pluggable-inference-provider.md).

# Rooms

| Room | AI acts as | Graph holds |
|---|---|---|
| Learn | tutor | concepts, prerequisites, what you have shown you understand |
| Think | Socratic foil | positions, objections, replies, your own moves |
| Explore | guide | branches, related territories, leads |
| Decide | analyst, devil's advocate | options, criteria, trade-offs, the call and why |
| Discover | not defined | not defined |

Only Learn exists, as a [PoC](/architecture/poc-learn-room.md). The list is open and the room
system is not designed yet.

# Not settled

See [issues/](/issues/index.md): prompt and context management, on-disk format, the room
system itself.
