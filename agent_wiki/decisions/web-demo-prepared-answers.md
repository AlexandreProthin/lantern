---
type: Decision
title: The web demo replays prepared answers
description: A free public demo of the Learn room on GitHub Pages - prepared answers with a model-like wait instead of inference, Learn only, published on release tags and by hand.
tags: [web-demo, provider, github-pages, cost]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-17T16:30:00Z }
---

Decided 2026-10-17 with the user. The user's goals: minimal maintenance, the main features working,
free (no inference), prepared subjects, one room.

# Options

| Option | Verdict |
|---|---|
| Live inference through an API key | Rejected: costs per visitor and needs a backend to hide the key. |
| The browser build's existing fake provider | Rejected: placeholder text ("Mechanism 1") shows nothing of the product. |
| Prepared answers behind the same provider seam | **Chosen.** No server, no cost, real content; the app code stays as it is. |

# Decision

- **Scripted tutor.** A demo build replaces Learn's fake provider with one that replays prepared text
  for the prepared subjects, after a 2 to 4 s wait so it feels like a model, and answers anything else
  with an honest fallback. Answers to a check are shown, never graded.
- **Learn only**, using the one-room frame that already existed (RS-5).
- **Two subjects**: TCP congestion control as a recent project, and Blender 3D prefilled on Welcome so
  a visitor experiences creating a subject.
- **GitHub Pages, from a workflow**, on every `v*` tag and by hand, after an end-to-end test of the built
  site. Tags rather than every push, so the demo always matches the latest release.
- **Public repository first**: free Pages needs it. The work waits on its branch until the user makes
  the repository public.

# Costs

Hosting and builds are free on a public repository. What it adds is in
[Demo runtime](/components/web-demo/runtime.md) and [Demo content](/components/web-demo/content.md).
Ongoing work: none unless the Learn protocol or the demo subject changes; the tests say when.
