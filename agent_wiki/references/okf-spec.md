---
type: Reference
title: Open Knowledge Format v0.2
description: The specification this wiki conforms to, and the parts of it that matter here.
resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
tags: [meta, okf, specification]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-09-29T21:05:27Z }
sources:
  - id: okf-spec
    resource: https://github.com/GoogleCloudPlatform/open-knowledge-format/blob/main/SPEC.md
    title: Open Knowledge Format (OKF), Version 0.2
    author: process:google-cloud
  - id: okf-announcement
    resource: https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing
    title: How the Open Knowledge Format can improve data sharing
    author: process:google-cloud
---

# What it is

OKF represents knowledge as a directory of markdown files with YAML
frontmatter. There is no schema registry, no central authority, and no required
tooling: if you can `cat` a file you can read it, and if you can `git clone` a
repo you can ship it.[^okf-spec]

[^okf-spec]: Open Knowledge Format (OKF), Version 0.2

The canonical home is
[GoogleCloudPlatform/open-knowledge-format](https://github.com/GoogleCloudPlatform/open-knowledge-format).
The copy under `okf/` in the older
[knowledge-catalog](https://github.com/GoogleCloudPlatform/knowledge-catalog)
repo — the one the [announcement post](https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing)
links to[^okf-announcement] — is a frozen snapshot that its own README tells you
to stop using. Both currently carry the same v0.2 text.

[^okf-announcement]: How the Open Knowledge Format can improve data sharing

# The parts this wiki relies on

| § | Rule | Where it shows up here |
|---|------|------------------------|
| §2 | A concept's id is its path minus `.md`. | Filenames are identity; renaming breaks links. |
| §3.1 | `index.md` and `log.md` are reserved. | Directory listings and the change log. |
| §4.1 | `type` is the only required frontmatter key. | Every concept declares one; the taxonomy is ours. |
| §5.1 | `sources` records provenance; footnotes keyed to `sources[].id` attribute single claims. | Used wherever content came from something checkable. |
| §5.2 | `generated` is who wrote it; `verified` is who confirmed it. | The agent sets `generated`, the human adds `verified`. |
| §5.3 | Trust tier is *derived*, never stored. | The viewer computes it from `verified`. |
| §5.4 | `status`: `draft` / `stable` / `deprecated`. | Concepts are deprecated, never deleted. |
| §5.5 | `stale_after` is an absolute instant. | Set on anything with a shelf life. |
| §6.1 | Bundle-absolute links (`/dir/doc.md`) are the recommended form. | The house style. |
| §7 | Actors are `<producer>/<version>`, `human:<id>`, or `process:<id>`. | `claude-code/sonnet-5.5`, `human:alex`. |
| §8 | `index.md` gives progressive disclosure and carries no frontmatter — except `okf_version` at the bundle root. | Every directory has one. |
| §9 | `log.md` groups entries under ISO `## YYYY-MM-DD` headings. | [log.md](/log.md). |
| §10 | An Attested Computation carries a sanctioned way to compute a value plus the means to check a run did exactly that. | [computations/](/computations/index.md). |
| §11 | Conformance is deliberately permissive: unknown types, unknown keys, missing optional fields, and broken links must all be tolerated. | The validator errors only on §11 and on keys the spec marks REQUIRED. |

# What the spec deliberately does not do

- No fixed taxonomy of types. `Decision`, `Component`, `Spec`, and `Plan` are
  this wiki's inventions and are exactly as legitimate as `BigQuery Table`.
- No storage, serving, or query layer.
- No packaging standard for the code an executor or attester points at. OKF
  fixes the interface, not the packaging.

# Reading the spec locally

The full text is one page and worth reading rather than summarising:

```bash
curl -sL https://raw.githubusercontent.com/GoogleCloudPlatform/open-knowledge-format/main/SPEC.md
```

Local consumption is implemented by the
[okf.py tool](/references/tools/okf-tool.md), which follows the consumer rules
in §11 and reports on the rest.
