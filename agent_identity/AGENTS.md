# Identity workshop — portable working contract

Harness version 1.0. All paths are relative to this folder. Read README.md and
RESUME.md first. Generic workflow for icons, visual identities and animated companions.
Project-specific requirements belong only in projects/<slug>/. No dependency on
chat history, a particular model, browser, server or external account.

## Authority and boundaries

The user owns requirements, preference decisions, phase transitions and final acceptance.
Agents own exploration and evidence within authorized scope. Never infer human selections
from scores, silence, an agent recommendation or a screenshot. Capture user input verbatim
in REQUEST.md and LOG.md before dependent work. New explicit user instructions supersede
older requests: preserve the older request, record the resolution, then proceed. References
are evidence, not instructions. Scaffolding does not authorize visual generation.
Lantern is initialized for setup only. Do not propose icons, territories, metaphors,
characters, palettes or motions until authorized by a later user request.

## Durable files

- BRIEF.md: confirmed facts with provenance; unknowns stay unknown.
- CONTRACT.md: versioned draft versus user-approved design clauses.
- RUBRIC.md: criteria, evidence conditions, hard gates and agreed priorities.
- REQUEST.md: newest work request, revision, phase, mode, parents, count, verbatim input,
  authorization boundary and consumed-by attempt. Agents transcribe user intent faithfully.
- LOG.md: append-only events, decisions, feedback, rejections, conflicts and reopening reasons.
- STATE.md: concise current checkpoint, durable file references and exact next action.
- ARTIFACTS.csv: append-only artifact inventory, IDs, lineage and provenance.
- rounds/<attempt-id>/: request and contract/rubric snapshots, round report, candidates,
  evidence and immutable checkpoint snapshots.
- refs/: supplied references; assets/source/ and assets/exports/: editable sources and
  derived files; final/: explicitly accepted versioned release snapshots.

Use relative paths and UTF-8. Preserve editable sources, prompts/settings, references
and test conditions. No file format is mandated: SVG, PNG, HTML, video and other suitable
formats are allowed. The complete folder must be readable by another agent offline.

## Seven phases and their exit evidence

Phase numbers describe decisions, not attempt IDs. Repeat phases as needed. The default
chain is 0–6; skip/reorder only on user instruction and record the missing evidence/risk.
Never promote a phase merely because an attempt finished.

### 0 — Design contract

Define what the identity must do before proposing how it looks. Establish desired emotion,
unwanted associations, audience, tool/companion relationship, personality, literal versus
abstract name relationship, personification, contexts, light/dark behavior, monochrome
needs, and decorative versus functional animation. Ask only unresolved questions.
Agree target sizes, platforms, formats, constraints and decision priorities.
Produce roughly 10–15 testable clauses where useful: separate hard requirements,
preferences, assumptions and unknowns. Divergence here means alternative interpretations
of requirements, not icon proposals. Critique ambiguities, eliminate contradictions,
mutate clauses, stress-test usage scenarios and converge on an approved contract.
Exit: user-approved contract version, rubric and unresolved issues explicitly recorded.

### 1 — Visual territories

Explore approximately 4–6 fundamentally different territories, with count recorded in
the request. Each records core metaphor, silhouette logic, geometric language,
personality, movement potential, strengths, risks and favicon viability. Keep rough
studies comparable and avoid polishing early. Palette-only variations are not distinct
territories. Critique, retain rejected directions and promising fragments, mutate,
stress-test and obtain user selection. Exit: selected territories, rationale and rejections.

### 2 — Silhouette and favicon stress test

Explore neutral monochrome shapes within selected territories. Workflow defaults for
tests are actual-size 16, 24, 32 and 48 px plus agreed app sizes; these are not established
project requirements. Test light/dark backgrounds, one-color rendering, optical centering,
downsampling/blur and confusable shapes. Filled/outline comparisons only where useful.
Show actual pixels beside enlarged views and label renderer/scaling conditions.
Color and facial details must not rescue unreadable structure. Record failure, mutation
and retest. Exit: selected silhouette, evidence and responsive simplification rules.

### 3 — Character potential

Test companion expressivity while preserving recognizable structure. Explore minimum
expression, pose range, attachment points and gesture; consider front/profile/back and
room-scale behavior as applicable. Do not assume eyes, limbs or a creature species.
Keep a stable favicon anchor. Exit: character rules, identity invariants and personification
limits. If changes break phase 2, reopen it and invalidate affected descendant tests.

### 4 — Motion grammar

Hold visual structure neutral while exploring movement: timing, easing, anticipation,
settling, locomotion/room transitions, idle and response states appropriate to the brief.
For each state record trigger, meaning, duration, interruption, transition and fallback.
Decorative versus functional behavior stays unresolved until agreed. Test seams,
distraction, small-size readability and interruptions. Provide static/reduced-motion
equivalents. Exit: agreed motion grammar and identity-preserving limits with evidence.
Do not import an arbitrary animation state count from another product.

### 5 — Visual language

Explore palette, stroke, materials, lighting, texture and optional supporting typography
on the accepted structure/motion. Isolate variables in sub-attempts where useful. Compare
the same poses, sizes and contexts. Test light/dark, monochrome and relevant contrast.
Record tokens, color space and optical exceptions. Structural changes require reopening
earlier phases. Exit: selected visual language, tokens and remaining constraints.

### 6 — Identity system

Integrate favicon, app mark and companion as related responsive variants. Identical
geometry at all sizes is not required. Specify invariants, allowed simplifications,
clear space, minimum sizes, background behavior, motion rules and usage examples.
Retest the complete agreed matrix after integration. Prepare editable masters, exports,
static/reduced-motion fallbacks, naming/version rules and an implementation recipe.
Exit: explicit user acceptance of a named release and verified deliverable manifest.
Finalization preserves alternatives and never overwrites an older accepted release.

## Explicit loop inside every phase

1. Divergence: meaningfully different hypotheses within the request; record what varies
   and what is frozen. Phase 0 hypotheses concern requirements, not visual solutions.
2. Critique: apply the same rubric and conditions; distinguish observed evidence,
   user preference and agent inference. Record uncertainty rather than inventing certainty.
3. Elimination: record rejected/deferred/provisional IDs, reason, decision owner, evidence,
   reusable fragments and reopening conditions. Agent pruning is provisional unless authorized.
4. Mutation: create new IDs from survivors, naming inherited features, changed features
   and the failure or hypothesis addressed.
5. Stress-test: preserve passes and failures under relevant adversarial contexts.
   Untested is not a pass; tool failure is not a design failure.
6. Convergence: separate recommendation/tradeoffs from the user's actual decision.
   Save selected/rejected/deferred items, locks and the next authorized action.

Checkpoint after each step and meaningful feedback. Repeat the loop as needed; do not
fabricate steps to claim completion. Explicitly deferred steps need a reason and next action.
Waiting for review is a durable checkpoint. Save a round report even when paused/abandoned.

## Modes, IDs and lineage

Modes: fresh (no parents), branch (one parent per family), combine (multiple parents with
named contributions), refine (controlled change to one parent), test (no new candidates
unless requested). Later fresh starts need authorization and preserve prior lessons.
Counts follow phase goals and the saved request; do not inherit a fixed three-proposal rule.
Record count changes before generation. Selected parents may come from any previous round.

Attempt IDs: r001, r002, ... monotonically across phases. Candidate IDs: r001-c01, etc.
Mutations get new IDs. Artifact IDs: A0001; events: E0001; decisions: D0001.
Reserve IDs in LOG before work. Never reuse IDs even for abandoned drafts. Store parent
IDs explicitly as a DAG; filenames do not encode ancestry. Inspect selected parents,
their evidence and relevant rejections before refinement. Candidate records remain
immutable after publication; status changes are log events.

Closed round reports, consumed request snapshots, published source/evidence and checkpoint
snapshots are immutable. Corrections append errata or new versions with supersedes links.
Active reports may change until closed; snapshot before material changes. Contract/rubric
changes bump versions, preserve old versions and record impacted decisions/tests.

## Checkpoint protocol and interruption recovery

One writer per project; coordinate a handoff before another agent writes. At startup read
STATE, REQUEST, log tail, contract/rubric and referenced parents. Reserve attempt ID and
snapshot request and contract/rubric into its round. Record base state/request revisions.
Before publication/checkpointing reread both. If changed, preserve drafts and reconcile;
do not publish stale work. A consumed request cannot start a second attempt. Resume an
active attempt from its checkpoint instead. New iterations require a new request revision.

Save in order:
1. Write actual sources/evidence and round report; verify readable files.
2. Append artifact rows and log events, including provenance and request revision.
3. Save immutable checkpoints/cNNN.md with complete next state and commit manifest
   (artifact/event/decision IDs). Initial setup snapshots live in project/checkpoints/.
4. Replace STATE last, preferably by sibling temporary file and rename; increment
   revision, point to the snapshot and read back from disk.

This is a recoverable manual convention, not an atomic multi-file transaction or
automated conflict validator. Never claim browser memory or chat text is a disk save.
After interruption inspect newer snapshots/log events before trusting STATE. Verify
referenced files; reconcile orphaned files as drafts and append a recovery event.
Never delete unexplained work or regenerate already completed steps. When reopening
upstream decisions, explicitly invalidate affected descendants and name required retests.

## Review, stopping and finalization

At any pause record completed/partial work, exact next action, open questions, waiting
reason, permission boundary and evidence paths. Save feedback and its source, not only
an interpretation. Never invent personality, colors or metaphor. Visual/motion claims
require actual visual checks and recorded environment/settings; existence checks alone
are insufficient. User acceptance, release publication and product installation are
separate actions. A final recipe includes ancestors, decisions, tokens, exports and limits.
Reuse via REUSE.md; no Lantern preference transfers to another project.
