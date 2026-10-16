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
  into a room built for one kind of work: learning, choosing, and later thinking and
  exploring. Each
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

The subject belongs to you, not to a room. Today a subject lives in the room it was
created in; taking the same subject into several rooms is planned.

| Room | State | The AI acts as | The graph holds |
|---|---|---|---|
| **Learn** | shipped (v0.1.0) | a tutor | concepts, prerequisites, what you have shown you understand |
| **Choose** | shipped (v0.3.0) | a researcher and adviser | your needs, ranked criteria, products with sourced and dated facts, a shortlist, your pick |
| **Think** | planned | a Socratic foil | positions, objections, replies, your own moves |
| **Explore** | planned | a guide | close to Learn without the learning angle; still to be defined |
| **Interview** | planned | a coach | your resume, skills and experience, interview preparation, job leads |

Learn grew out of the *make me learn* skill and Think will grow out of *make me think*.
Choose walks you from knowing nothing about a kind of product to a reasoned choice: it
surveys your needs, researches products on the web with their sources and dates, fills a
comparison board for your shortlist and recommends, but the pick is always yours.

## How it works

```
subject        what you're working through ("how TCP congestion control works")
  └── room     where you've taken it (learn · choose · …)
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

**v0.3.0** (2026-10-16): the **Choose** room, the second room, on a room-generic frame.
Switch rooms with the room chip or Ctrl+Shift+1 / Ctrl+Shift+2; Learn is unchanged.
v0.2.0 (2026-10-14) laid that frame and moved subjects to the `lantern/2` format,
converting Learn files on first open. Installed builds update themselves from GitHub
releases (from a local update folder while the repository is private).

1. **Proof of concept** ✔ built, replaced by v0.1.0. It is kept at the `poc-final` tag
   (`git show poc-final:poc/README.md`).
2. **Project wiki** ✔ [`agent_wiki/`](agent_wiki/index.md): an OKF bundle that is the
   project's working memory (decisions, architecture, specs, plans, issues).
3. **Specs** ✔ in [`agent_wiki/specs/`](agent_wiki/specs/index.md), worked out in the
   [spec workshop](agent_design/tool/specs_work/README.md).
4. **v0.1.x, the Learn room** ✔ [`app/`](app/README.md), plans
   [v0.1.0](agent_wiki/plans/v0-1-0.md) to [v0.1.2](agent_wiki/plans/v0-1-2.md).
5. **v0.2.0 and v0.3.0, the Choose room** ✔ [plan](agent_wiki/plans/v0-2-0.md).

Where the project stands and what comes next: [roadmap](agent_wiki/plans/roadmap.md).

## Open work

Agreed but not scheduled, in the [backlog](agent_wiki/plans/backlog.md):

- **More rooms**: Think, Explore and Interview, each starting with a spec workshop round.
- **Export a subject**: take a subject's graph out of Lantern; the format is still to be decided.
- **Regenerate an explanation**: ask the tutor to rewrite a node's explanation.

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
  frontmatter). It is Lantern's working memory ([`agent_wiki/`](agent_wiki/index.md)),
  and an OKF bundle is one candidate form for exporting a subject.
