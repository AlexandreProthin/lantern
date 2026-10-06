---
type: Issue
title: Tutor prose quality beyond protocol evals
description: Haiku passes the automated learn-1 checks, but sampled explanations contain internally inconsistent analogies and need pedagogical review.
tags: [learn, evals, pedagogy, models, v0.1.0]
status: stable
generated: { by: Codex/GPT-6, at: 2026-10-02T17:55:00Z }
---

# Observed

The three `learn-1` Haiku/low runs pass 24/24 protocol/language/link checks each.
Those checks validate machine-readable structure, not the truth or teaching quality
of the explanation. Agent review sampled the first run's English and French prose,
covering both map sizes and each task; the language matches the requested language.

In run 1, `en-300-light` first says the near side is pulled more strongly than the
centre, then its rubber-ball analogy says the centre is pulled more strongly than
both edges. The explanation contradicts its own comparison. Several French
analogies similarly need review; coherent French alone does not establish correct
teaching. Detailed replies remain locally in `app/evals/results/` (git-ignored).

# Consequence

The automatic 95% gate still passes. It must not be presented as a factual or
pedagogical quality score. There is no prompt change in this implementation:
`learn-1` is the approved text, and Haiku is the cheap eval model; the product
default remains Opus. Native acceptance and the dogfooding week should review
teaching quality on the selected model. A prompt change requires the plan's spec
workshop path and a new prompt version, followed by the same three-run gate.

# Review

The user reviewed tutor prose for teaching quality in the v0.1.0 acceptance walk and ticked the gate on 2026-10-04 (`app/ACCEPTANCE.md`); no prompt change was asked. The limit above still holds: the eval score is not a teaching-quality score.

See [runtime evidence](/components/v010-learn-runtime.md),
[implementation plan](/plans/v0-1-0.md) and
[platform quality](/specs/platform-quality.md).
