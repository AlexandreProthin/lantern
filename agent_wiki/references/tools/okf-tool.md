---
type: Tool
title: okf.py
description: Validates this bundle against OKF v0.2.
resource: /references/tools/okf.py
tags: [meta, tooling, okf]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:05:27Z }
sources:
  - id: okf-reference-agent
    resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/tree/main/src/reference_agent
    title: OKF reference agent (Apache-2.0)
    author: process:google-cloud
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

# What it does

One subcommand, one file, no project dependencies beyond PyYAML.

```bash
python agent_wiki/references/tools/okf.py validate --bundle agent_wiki [--strict]
```

`validate` checks the bundle against OKF v0.2 and exits non-zero if it is not
conformant. It is the conformance authority for this bundle.

There is no viewer to generate. The bundle is plain markdown — read it with
`cat`, in an editor, or on any git host. For graph, table, and reader views over
a whole project, open the project in the
[Prism](https://github.com/AlexandreProthin/prism) app, which loads this bundle
as its wiki lens.

# Errors versus warnings

The split is the spec's, not a preference. **Errors** are the §11 conformance
criteria plus the keys the spec marks REQUIRED inside an optional family
(`generated.by`, `verified[].by`, `sources[].resource`, `runtime` on an
Attested Computation). A bundle with any of them is not conformant.

**Warnings** are SHOULD-level guidance: a missing `description`, a directory
with no `index.md`, a link to a concept that does not exist, a timestamp
without a UTC offset, a footnote with no matching source. The spec explicitly
forbids a consumer rejecting a bundle over these (§11), so they never fail a
run unless `--strict` is passed.

# Provenance

Derived from Google's OKF reference agent[^okf-reference-agent] (Apache-2.0);
the license and the full list of changes are in the file header and in
[NOTICE](/references/tools/NOTICE). The substantive departures:

[^okf-reference-agent]: OKF reference agent (Apache-2.0)

| Change | Why |
|--------|-----|
| Resolves bundle-absolute (`/`-prefixed) links. | Upstream skips them, so no edge is drawn for the link form §6.1 calls RECOMMENDED. |
| Ignores links inside code spans and fences. | A link in an example is documentation, not an edge — this wiki documents its own link syntax. |
| Excludes `log.md` from the concept walk. | Upstream skips only `index.md`, so `log.md` surfaces as a bogus `Unknown`-typed concept. |
| Accepts a trailing `Z` in timestamps. | `datetime.fromisoformat` only learned `Z` in Python 3.11; on 3.10 upstream reports every concept as fresh. |
| Adds `validate`. | Upstream ships no conformance checker. |
| Omits `visualize` and the viewer assets. | Bundles are read as plain markdown or opened in the [Prism](https://github.com/AlexandreProthin/prism) app; the derived generator, its template, CSS/JS, and vendored libraries are not carried. |

# Tests

```bash
python -m pytest agent_wiki/references/tools/tests -q
```

The suite lives inside the bundle rather than in the project's `tests/` tree so
that the wiki stays portable: the whole `agent_wiki/` directory can be copied
into another project and still prove itself.
