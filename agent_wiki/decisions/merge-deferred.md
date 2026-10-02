---
type: Decision
title: Merge is Later; v0.1.0 is a tree
description: Several-parent merge nodes are postponed; v0.1.0 graphs are trees with text links, and the stored format stays merge-ready.
tags: [graph, merge, domain-model, scope]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-02T08:15:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Decided 2026-10-01 (spec workshop round 2, q-r2-merge and q-r2-shape). The `parents` array form was agreed in round 3 (q-r3-links, 2026-10-02).

# Context

Round 1 asked for merge nodes: Ctrl+click several nodes to make a new node with several parents. Round 2 showed the cost: a DAG changes the graph layout, the context assembly (several paths to the root), the tutor protocol and the invariants (no ancestor relations between parents), for a feature the daily tool does not need first.

# Decision

- v0.1.0 graphs are **trees**: every node has exactly one parent, except the root.
- Relations between branches live in the text as markdown links `[label](node:<id>)`, drawn as faint dotted lines and toggled from the legend. There is no edge list.
- The stored form is `parents: string[]` holding exactly one id, so that merge can be added later with no format change.
- Merge, its shortcuts, the `merge` node kind and the `merge` log task are Later.

# Options

| Option | Verdict |
|---|---|
| Merge nodes in v0.1.0 | Rejected: layout, context and prompt cost for little daily value. |
| Tree plus text links, merge-ready format | Chosen. |
| Tree with a single `parentId` | Rejected: a later merge would need a format migration. |

# Consequences

[domain-model](/specs/domain-model.md) (DM-11, DM-12, DM-53) and [product-scope](/specs/product-scope.md) (PS-22) are written accordingly. Re-adding merge brings back the ancestor rule.
