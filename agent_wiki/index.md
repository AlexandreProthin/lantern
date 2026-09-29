---
okf_version: "0.2"
---

# The wiki

The agent's working memory for this project, kept as an [Open Knowledge Format
v0.2](references/okf-spec.md) bundle: plain markdown with YAML frontmatter, no
tool required to read it, diffable in git.

Start with the [maintenance protocol](references/wiki-protocol.md) — it says
what belongs where and how concepts are written. This bundle is read as plain
markdown; for graph, table, and reader views open the project in the
[Prism](https://github.com/AlexandreProthin/prism) app.

# Knowledge

* [architecture/](architecture/) - How the system is put together: layers, data flow, runtime shape.
* [components/](components/) - One concept per real module or subsystem, bound to a path.
* [specs/](specs/) - Behaviour contracts: what the thing must do, independent of how.
* [decisions/](decisions/) - Choices made and the reasoning behind them, never rewritten.

# Work

* [plans/](plans/) - Work not yet done: roadmaps, staged plans, todos.
* [issues/](issues/) - Known defects, limitations, and open questions.

# Machinery

* [computations/](computations/) - Sanctioned, runnable procedures whose result can be attested.
* [references/](references/) - External material, run instructions, attesters, and the wiki's own tooling.
* [log.md](log.md) - What changed here, newest first.
