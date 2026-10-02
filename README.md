# Lantern

**Light up what you're working through.** Lantern is a desktop workspace for thinking
with an AI, not just asking it things. You bring a subject — something to learn, a
question to reason through, a decision to make — and Lantern builds it up with you as a
**graph of ideas** you can see, walk, and come back to, instead of a chat log that
scrolls away.

## Why

A chat window is a poor place to learn or think. The structure you build up during a
session (what depends on what, what you already understand, what is still open) stays
in your head or gets lost in the scroll. The next session starts from zero, and the AI
leans toward giving answers when doing the work yourself is often the point.

Lantern keeps that structure outside your head and makes it persistent:

- **A graph, not a transcript.** Every concept, question, claim, and open end is a
  node. The conversation feeds the graph; the graph is what stays.
- **Rooms set the mode of work.** You carry the lantern (your subject and the AI)
  into a room built for one kind of work: learning, thinking, exploring, deciding. Each
  room is furnished differently, but the same lantern lights them all.
- **You do the work.** When the room calls for it (learning, thinking), the AI teaches,
  questions, and pushes back rather than handing over conclusions.
- **Sessions persist.** A subject is saved to disk in a readable format. You can
  reopen it, pick up where you left off, and watch it grow.

## Rooms

A room is a **place built for one kind of cognitive work**. You bring a subject into it.
The room sets the AI's role, what nodes and edges mean, and what "progress" looks like.
Each room has its own walls (its own UI color), and the lantern is the same in all of
them.

The subject belongs to you, not to a room. It *visits* rooms, and the same subject can
be taken into several of them.

| Room | The AI acts as | The graph holds | Lineage |
|---|---|---|---|
| **Learn** | a tutor | concepts, prerequisites, what you have shown you understand | *make me learn* skill |
| **Think** | a Socratic foil | positions, objections, replies, your own moves | *make me think* skill |
| **Explore** | a guide | branches, related territories, leads to follow | — |
| **Decide** | an analyst and devil's advocate | options, criteria, trade-offs, the call and why | — |
| **Discover** | … | … | — |

The list is open and the design is not settled. See [Open work](#open-work).

## How it works (intended shape)

```
subject        what you're working through ("how TCP congestion control works")
  └── room     where you've taken it (learn · think · explore · decide · …)
        ├── graph   the structure built up so far (nodes, edges, states)
        ├── panel   reads and works one node: explanation, dialogue, notes
        └── llm     an inference provider driven by the room's prompts + context
```

- **Graph view**: the subject at a glance. Pick a node to focus it.
- **View panel**: the working surface for the focused node, where content is rendered
  and the dialogue happens.
- **Inference provider**: pluggable. The first one is the **Claude Code CLI**
  (`claude -p`, streamed), so Lantern runs on an existing subscription with no API key
  to manage.

## State

**Proof of concept.** The project has only just started.

1. **Proof of concept** ✔ built, being tried. Use case: **learning**. A graph, a view
   panel, and one LLM provider (Claude Code CLI), wired end to end. Throwaway code whose
   job is to show the loop works and is worth building. See [`poc/`](poc/README.md).
2. **Project wiki** ✔ [`agent_wiki/`](agent_wiki/index.md): an OKF bundle that is the
   project's working memory (decisions, architecture, open issues, roadmap).
3. **Specs + v0.1.0 plan** ✔ 13 agreed specs in [`agent_wiki/specs/`](agent_wiki/specs/index.md),
   worked out in the [spec workshop](agent_design/tool/specs_work/README.md).
4. **v0.1.0 implementation** ▶ next: follow the [plan](agent_wiki/plans/v0-1-0.md), starting
   at M0 (scaffold) and the Welcome design track.

## Open work

Topics that need dedicated design time before or during the specs:

- **Prompt engineering and context management**: per-room system prompts, what part
  of the graph goes into context on each turn, and how a long-lived subject stays
  within budget.
- **Saving structure and format**: how a subject lives on disk. It should be readable
  and diffable, and possibly an OKF bundle, so the prism tooling can read it.
- **The room system**: which rooms exist, what each one owns (roles, node types, view
  set), and how moving a subject between rooms works.

## Tech stack

Same as [Prism](https://github.com/AlexandreProthin/prism): **Tauri 2** (Rust) shell,
**Svelte 5 + TypeScript** front end, shipped as a standalone Windows desktop app.

## Related work

- **Prism**: the review cockpit for AI coding output. Lantern reuses its stack, its
  graph and panel UI patterns, and the idea of one top-level axis that reshapes the whole
  app (Prism's *lens*, Lantern's *room*).
- **make me think**: a Socratic session skill where the user reasons and the AI resists.
  It is the seed of the *Think* room.
- **make me learn**: a learning session skill. It is the seed of the *Learn* room and of
  the PoC.
- **OKF wiki**: the Open Knowledge Format project wiki (markdown concepts plus YAML
  frontmatter). It will become Lantern's working memory, and it is a candidate for the
  on-disk subject format.
