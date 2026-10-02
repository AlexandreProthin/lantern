---
type: Protocol
title: Wiki maintenance protocol
description: How this wiki is written, linked, validated, and kept honest over time.
tags: [meta, conventions, okf]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:05:27Z }
sources:
  - id: okf-spec
    resource: /references/okf-spec.md
    title: Open Knowledge Format v0.2 specification
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

# Purpose

This bundle is the agent's working memory for the project: what exists, why it
is shaped that way, what is planned, and what is broken. It is written by the
agent and read by everyone. It follows the [Open Knowledge Format
v0.2](/references/okf-spec.md) so that nothing here is locked to one tool — any
consumer that reads markdown can consume it.[^okf-spec]

[^okf-spec]: Open Knowledge Format v0.2 specification

# Roles

| Role | Who | What they do |
|------|-----|--------------|
| Producer | the agent (`claude-code/<model>`) | Writes and maintains every concept. Sets `generated`. |
| Reviewer | the human (`human:<id>`) | Reads, and signs off by adding a `verified` entry. Never edits concept bodies — an edit the agent did not make is invisible to it. |
| Consumer | any agent, viewer, or search index | Reads. Must tolerate anything optional being absent. |

The split matters for trust: `generated` says who *wrote* a concept,
`verified` says who *confirmed* it, and only a `human:` verifier raises a
concept to the **human-reviewed** tier (OKF §5.3). If the human wants a change,
they say so in conversation and the agent makes it — that keeps `generated`
truthful.

# Where things go

| Directory | Holds | Typical `type` |
|-----------|-------|----------------|
| [architecture/](/architecture/index.md) | How the system is put together: layers, data flow, runtime shape. | `Architecture` |
| [components/](/components/index.md) | One concept per real module or subsystem, bound to a path via `resource`. | `Component` |
| [decisions/](/decisions/index.md) | Choices made and their reasoning, ADR-style. Never rewritten, only superseded. | `Decision` |
| [specs/](/specs/index.md) | Behaviour contracts: what the thing must do, independent of how. | `Spec` |
| [plans/](/plans/index.md) | Work not yet done: roadmaps, staged plans, todos. | `Plan` |
| [issues/](/issues/index.md) | Known defects, limitations, and open questions. | `Issue` |
| [computations/](/computations/index.md) | Sanctioned, runnable procedures whose result can be attested. | `Attested Computation` |
| [references/](/references/index.md) | External material, run instructions, attesters, and tooling. | `Reference`, `Skill`, `Tool`, `Protocol` |

A directory that would hold exactly one concept does not need to exist; put the
concept where a reader would look for it first.

# Writing a concept

**Filename** is the identity (OKF §2): kebab-case, no dates, no numbering.
`decisions/postgres-over-sqlite.md` — not `decisions/003-database.md`. Renaming
a file breaks every link to it, so choose the name for what the concept *is*,
not for what it is currently about.

**Frontmatter** carries the fields a consumer filters on; the body carries
what a reader reads. Minimum for every concept:

```yaml
---
type: Decision                 # required, the only hard requirement
title: Store sessions in Postgres
description: One sentence a search snippet can show.
tags: [storage, performance]
status: stable                 # draft | stable | deprecated
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:05:27Z }
---
```

Add `resource` when the concept describes something that exists elsewhere — a
source file, an endpoint, a dashboard. Add `sources` when the content was
derived from material a reader might want to check, and attribute individual
claims with footnotes keyed to `sources[].id` (OKF §5.1).

**Body** favours structure over prose: headings, tables, lists, fenced code.
An agent retrieves from structure far more reliably than from paragraphs.

# Linking

Use bundle-absolute links — `[the parser](/components/parser.md)` — because
they survive a document moving within its directory. Relative links are legal
but only used between siblings.

Links are the graph. A concept that links to nothing and is linked from nothing
is invisible in the viewer and nearly invisible to retrieval, so every new
concept should be reachable from its directory's `index.md` at minimum.

Linking to a concept that does not exist yet is allowed and useful: it marks
knowledge worth writing. The validator reports it as a warning, never an error.

# Lifecycle

- `draft` — being written, may be wrong.
- `stable` — the default; trust it.
- `deprecated` — kept so old links still resolve; say what supersedes it in the
  first line of the body.

**Nothing is deleted.** A concept that stops being true becomes `deprecated`
and points at its replacement. Deleting it silently breaks links and erases the
reasoning trail, which is most of the value here.

Set `stale_after` on anything with a known shelf life — a plan targeting a
release, a benchmark result, a dependency survey. It is an absolute instant, so
staleness is a plain comparison with no reference to when the doc was read.

# Keeping the log

[log.md](/log.md) records what changed, newest first, under `## YYYY-MM-DD`
headings. One line per meaningful change, linking the concepts touched. It is
the answer to "what has the agent been doing", and it is the first thing to
read after being away.

Directory-level `log.md` files are allowed but rarely worth it; prefer the
root one until it gets unwieldy.

# Validating

Every change ends with a conformance check. The sanctioned way to run it is
the [wiki conformance computation](/computations/wiki-conformance.md); the
command it wraps is:

```bash
python agent_wiki/references/tools/okf.py validate --bundle agent_wiki
```

Errors mean the bundle is not conformant and must be fixed. Warnings are
advisory — the spec forbids a consumer rejecting a bundle over them (OKF §11) —
but a warning that stays for long is usually a concept that needs finishing.

# Viewing

There is no viewer to regenerate — this bundle is read as plain markdown, so
nothing here goes stale between edits. Read it with `cat`, in an editor, or on
any git host. For graph, table, and reader views over the whole project, open
the project in the [Prism](https://github.com/AlexandreProthin/prism) app, which
loads this bundle as its wiki lens directly from disk.
