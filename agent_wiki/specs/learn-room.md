---
type: Spec
title: Learn room behaviour contract
description: Every learner action in the Learn room - trigger, preconditions, task sent, what the tutor returns, and how graph and log change on success, cancel and error; plus the node state machine, concurrency and edge cases.
tags: [learn-room, behaviour, state-machine, actions, v0.1.0]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-02T11:00:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Source: spec workshop rounds 1–3 (2026-10-01/02). Agreed with the user 2026-10-02 (q-r3-review).

The contract between the learner, the app and the tutor in the Learn room. Data shapes are in
[domain-model](/specs/domain-model.md); the prompts, blocks and parsing the tutor side relies on are in
[tutor-protocol](/specs/tutor-protocol.md); what each call sends is in
[context-assembly](/specs/context-assembly.md). Scope: [product-scope](/specs/product-scope.md).
Learn has three spaces (Welcome, Study, Gallery; [decision](/decisions/rooms-have-spaces.md)). This spec covers
the actions of Welcome and Study; Gallery actions (rename, delete subject, reveal file) are not tutor actions.

# Conventions

- **Generative action**: one that makes one LLM call. Its *task* name (`intro`, `light`, `more`, `reply`, `check`, `suggest`) is what the prompt template and the context matrix use; the generation log uses the same names except `suggest`, which is never logged (LR-16).
- **Busy**: a generation is running in the subject, that is in its room visit (see Concurrency).
- **Previous state**: the node's state before the action started. Failure never changes it.
- **LR-1** A generative action MUST apply its result in one atomic step: node content or dialogue, new children, state change and the generation-log record are written together, then saved. A crash MUST never leave half of a result.
- **LR-2** Streaming text MUST be shown as it arrives (visible-text rule of [tutor-protocol](/specs/tutor-protocol.md)) but MUST NOT be stored in the graph until the call ends with outcome `ok`.
- **LR-3** Every call made on a subject MUST be logged, whatever its outcome ([domain-model](/specs/domain-model.md) DM-30 to DM-32). Non-generative actions and `suggest` (LR-16) write no log record.
- **LR-4** On error the node MUST show a message with a *Try again* control that re-runs the same action; the graph is unchanged, the log gets an `error` record.

# Generative actions

| Id | Action (trigger) | Preconditions | Task | The tutor must return | On success | On cancel / error |
|---|---|---|---|---|---|---|
| LR-10 | **Create a subject** (submit the Welcome field, or pick a suggestion then submit) | Title non-blank after trim, at most 120 chars; provider ready | `intro` | 2–4 sentence on-ramp, then `<options>` with exactly 3 `axis` entries | Subject file created with a root (`kind: subject`, `createdBy: learner`); Study opens on it; root becomes `lit` with the text; 3 open `axis` children; log record | Subject and an `open` root are kept and the learner stays in Study; the root shows *Light up* (the retry). Log `cancelled` / `error` |
| LR-11 | **Light up** an open node (the *Light it up* button, or Enter on the node; clicking a node only focuses it, LR-80) | `state = open`; not busy; node is not the root of a subject that has never been lit (that is LR-10) | `light` (`intro` for the root) | Detailed explanation of this node only, then `<options>` with exactly 3 entries | `content` = visible text, author = model; state `lit`; 3 open children (kind from the block); log record | Node stays `open`, content empty, placeholders removed. Log `cancelled` / `error` |
| LR-12 | **More options** (button in the panel) | `state` is `lit` or `understood`; not busy | `more` | Only an `<options>` block of 3 new directions; any prose before it is ignored | 3 new open children are added; existing children are never changed or replaced; no content change; log record | No change. Log `cancelled` / `error` |
| LR-13 | **Ask** (send in the dialogue box, Ctrl+Enter) | `state` is `lit` or `understood`; text non-blank; not busy | `reply` | Concise markdown reply; optionally one `<branch>`; `<understood/>` only per LR-33 | The learner turn is appended immediately and kept whatever happens; a tutor turn is appended (author = model, generationId); branch adds an open child of kind `question` (branch rule); log record | Learner turn stays, no tutor turn, a *Try again* control answers it. Log `cancelled` / `error` |
| LR-14 | **Test me** (button) | `state` is `lit` or `understood`; not busy | `check` | ONE understanding question, no answer, no blocks | A tutor turn is appended; its generation has task `check`, which is what marks a pending check (LR-33) | No turn added. Log `cancelled` / `error` |
| LR-15 | **Answer a check** (the learner's next message after a *Test me* question) | As LR-13 | `reply`, with `PENDING CHECK: yes` | Says what is right, corrects, nudges; MAY end with `<understood/>` | As LR-13; if `<understood/>` is present and valid: `state = understood`, `understoodBy = demonstrated` | As LR-13 |
| LR-16 | **Suggest 3 subjects** (Welcome button) | Provider ready; no suggestion already running | `suggest` | Only `<options>` with 3 entries (title, hook; no kind) | 3 suggestion chips appear; picking one fills the subject field (it does not start the subject). No node changes | Chips stay empty; a quiet message. No subject exists yet, so the call is **not logged** in v0.1.0 whatever its outcome |

- **LR-17** *Light up* on the root MUST send `intro` and force the kind of its children to `axis`; on any other node children use the kinds the tutor returned (fallback `deeper`).
- **LR-18** While *Light up* or *More options* runs, 3 pending placeholders SHOULD grow from the parent (120 ms stagger, 500 ms ease-out, breathe at 0.5↔0.8 opacity over 2.4 s; on a parsed block each becomes the real node in place, surplus ones shrink back over 300 ms; on cancel or error all shrink over 300 ms; replies and checks add no placeholders, the node itself pulses softly; reduced motion: no growth, no breathing).
- **LR-19** The settings in force when the call starts (tone, model, effort) are the ones logged and used, even if the learner changes them while it runs.

# Actions without a call

| Id | Action | Preconditions | Effect |
|---|---|---|---|
| LR-20 | **Add my own node** (panel form: title, optional hook) | Parent is `lit` or `understood`; parent not busy; title non-blank, at most 120 chars; hook at most 200 | New child: `kind: own`, `state: open`, `createdBy: learner`, author = user (display name, time). A title equal to a sibling's (normalized, see LR-62) is refused with an inline message. It is lit like any other node |
| LR-21 | **Dismiss** (on an open node) | `state = open`; node not busy | `dismissed`. Stays in the graph, faded; listed in the parent's *Dismissed (n)* fold |
| LR-22 | **Restore** (in the fold) | `state = dismissed` | `open` again, `createdAt` unchanged |
| LR-23 | **Delete** (node menu) | Not the root; confirm dialog shows the number of nodes removed | Node and its whole subtree removed; focus moves to the parent; log records are kept. If a generation runs on a node of that subtree it is cancelled first (log `cancelled`). Links to deleted ids degrade to plain text. Deleting a subject is a Gallery action |
| LR-24 | **I get it** | `state = lit`; not busy | `understood`, `understoodBy = self` |
| LR-25 | **Not sure anymore** | `state = understood`; not busy | `lit`, `understoodBy = null`. Never sent to the tutor |
| LR-26 | **Edit title / hook** (any node) | Node not busy (LR-42) | Value replaced; node gets `edited: {by, at}`. No `previous` (only explanation and turns keep one) |
| LR-27 | **Edit the explanation** (markdown, edit → save / cancel) | `state` is `lit` or `understood`; not busy; new text non-empty | `previous` = the model's original text, stored by the first edit only (a later edit does not overwrite it, so revert always returns to the model's text); `edited: {by, at}`; an *edited by <name>* mark shows; compare / revert to `previous` is offered |
| LR-28 | **Edit a tutor turn** | Turn is a tutor turn; node not busy | As LR-27 for that turn. **Learner turns are not editable** in v0.1.0 |
| LR-29 | **Select text → Ask about this** (popover) | Selection inside an explanation or a dialogue turn | The quote is put into the dialogue box as `> quote` and the box is focused. Sending is subject to LR-13 |
| LR-30 | **Select text → Make it a node** (same popover) | Current node is `lit` or `understood`, not busy | Open `own` child of the current node. Title = selection, trimmed, at most 80 chars. A longer selection becomes the hook (cut at 200 chars) and the learner is asked for a title. Duplicate sibling title: asked again |
| LR-31 | **Change tone** (subject menu, opened by clicking the subject title in the header) | Always | Sets the subject's tone: preset or custom text (at most 300 chars). Affects new generations only; nothing is regenerated |
| LR-32 | **Change model / effort** (the same subject menu) | Always | Sets the subject's model (alias opus, sonnet, haiku, or a free-text id) and effort (low, medium, high, xhigh, max) for future generations |

- **LR-33** A *Test me* question stays **pending until the learner's next message, which is treated as the answer** to it; a pending check does not expire. It is pending when the turn just before the learner's message is a tutor turn whose generation has task `check`, evaluated when the message is sent (so *Try again* of the same reply keeps it). `<understood/>` MUST be accepted only in that reply, on a node that is `lit` or `understood`; on a node `understood` by `self`, a confirmed check upgrades `understoodBy` to `demonstrated`. In any other reply the tag is stripped and ignored. Once answered, the check is closed whatever the reply says.
- **LR-34** *Edit* actions MUST NOT start a generation and MUST NOT change `state`.
- **LR-35** The learner's edits MUST reach the tutor on later calls and MUST take precedence ([context-assembly](/specs/context-assembly.md) CA-31, [tutor-protocol](/specs/tutor-protocol.md) TP-2).

## Cancel

- **LR-36** *Cancel* (button, or Esc per the shortcut table in [graph-view](/specs/graph-view.md) GV-76, while a generation runs and no dialog is open) MUST kill the provider process, discard the partial text, return the node to its previous state, remove placeholders, and write a log record with outcome `cancelled` and the usage known so far (0 when unknown).
- **LR-37** A learner turn sent before the cancelled call MUST stay in the dialogue.

# State machine

| From | To | Triggered by | `understoodBy` after |
|---|---|---|---|
| (new) | `open` | Tutor options or branch; *Add my own node*; *Make it a node*; subject creation (root) | `null` |
| `open` | `lit` | Light-up success (learner action LR-10 / LR-11) | `null` |
| `open` | `dismissed` | Learner: *Dismiss* | `null` |
| `dismissed` | `open` | Learner: *Restore* | `null` |
| `lit` | `understood` | Tutor `<understood/>` on a pending check (LR-15) | `demonstrated` |
| `lit` | `understood` | Learner: *I get it* | `self` |
| `understood` | `lit` | Learner: *Not sure anymore* | `null` |
| `understood` | `understood` | Confirmed check on a `self` node | `demonstrated` |

- **LR-38** Every other transition MUST be refused: no dismissing a `lit` or `understood` node, no un-lighting, no light-up of a `dismissed` node, no tutor-initiated `lit → open`.
- **LR-39** `understoodBy` MUST be non-null exactly when `state = understood`. `open` and `dismissed` nodes are always leaves (children can only be added to `lit` or `understood` nodes).

# Concurrency

- **LR-40** In v0.1.0 **one generation at a time per subject** (per room visit). While it runs, the learner can browse and read everything but cannot start another generation: every start control (*Light it up*, *More options*, *Send*, *Test me*) is disabled, with a tooltip saying why. The provider contract still allows concurrent calls, so parallel generation (Later) needs no provider change ([inference-provider](/specs/inference-provider.md) IP-50).
- **LR-41** Other nodes stay usable for browsing, reading, selecting and moving focus while another generates. Non-generative edits on *other* nodes (dismiss, restore, add, edit) are allowed.
- **LR-42** The busy node is read-only: title, hook, explanation, turns, state buttons, *Add my own node*, *Dismiss* of its children and *Make it a node* MUST be disabled until the call ends. *Cancel* is the only active control. The one exception is *Delete* of it or an ancestor, which cancels first (LR-23).
- **LR-43** Application of a result MUST check the graph at that moment (LR-60 to LR-62), not the graph as it was when the call started.

# The branch rule

- **LR-50** A `<branch>` in a `reply` creates one child of the current node, `kind: question`, `state: open`, `createdBy: tutor`. At most one per reply; any further blocks are ignored. Its title is checked like options (LR-62); a duplicate is dropped silently.
- **LR-51** `<branch>` is honoured only in `reply` results; elsewhere it is ignored.

# Options rules

- **LR-52** *Light up* and the intro always ask for exactly 3 options; *More options* asks for 3 more and adds to the existing children, never replacing or reordering them.
- **LR-53** The tutor sees every existing child of the node and every node title, dismissed ones included, and must propose different directions ([tutor-protocol](/specs/tutor-protocol.md) TP-3).
- **LR-54** A dismissed node MUST never be re-proposed: an option whose normalized title equals a dismissed node's is dropped by the app even if the tutor sent it (LR-62). Restoring is the only way back.

# Tone presets

Set per subject, default from Learn settings. The exact injected sentences are in [tutor-protocol](/specs/tutor-protocol.md) TP-10.

| Preset | Meaning for the tutor |
|---|---|
| ELI5 | Plain everyday words, concrete analogies, no unexplained jargon, short sentences |
| Curious | Warm and conversational; the why before the how; assumes a bright adult with no background |
| Student | Clear lecture-note style; defines terms, worked examples; assumes school-level basics |
| Engineer | Precise and practical; mechanisms, trade-offs, numbers, formulas or code when they help; assumes technical literacy |
| Expert | Dense, standard terminology, no basics, edge cases and caveats |
| Custom | The learner's free text, treated as a style instruction only; it can never override the protocol |

# Method rules inherited from the PoC

The tutor's behaviour, kept from `LEARN_SYSTEM` (the learning-session method):

- **LR-70** Never dump everything: cover only the node the learner chose; other nodes are for later.
- **LR-71** Teasers are a short title plus one hook line, never a mini-explanation.
- **LR-72** Options are genuinely distinct (not three phrasings), mixing a deeper sub-aspect, an application, an adjacent concept and a hands-on exercise.
- **LR-73** Do not re-explain what is lit elsewhere: link to it by name (`node:<id>` link).
- **LR-74** The learner does the work: when checking, ask, nudge and correct, but do not hand over the answer to someone who is close.
- **LR-75** A check question tests understanding (apply, predict, explain why, spot the mistake), not recall of a definition.
- **LR-76** Write in the language of the subject title unless the learner writes in another.
- **LR-77** Markdown with light formatting, no top-level heading (the node title is shown above the text).

# Focus and light-up

- **LR-80** Clicking an open child under *Where to go next* **focuses** it; it does not light it. Lighting needs *Light it up* or Enter on the node, which matches clicking a node in the graph ([node-panel](/specs/node-panel.md) NP-8).
- **LR-81** Keys that drive these actions (Enter, Ctrl+Enter, Esc, Home) are listed once, in the canonical table of [graph-view](/specs/graph-view.md) GV-76.

# Edge cases

- **LR-60** *Options block with fewer than 3 valid options*: create the valid ones (after LR-62 filtering), show a quiet notice *Only n directions came back* with a *More options* button. Never retry automatically.
- **LR-61** *More than 3 options*: keep the first 3 valid ones, discard the rest.
- **LR-62** *Duplicate title*: compare after normalizing (trim, collapse whitespace, lowercase, strip diacritics) with every node in the room visit in any state. A match is dropped and counts as missing for LR-60. Refused for the learner's own nodes only among siblings (LR-20).
- **LR-63** *Reply arriving after its node was deleted*: the result MUST be discarded (no node to attach to); the log keeps a record with the outcome `cancelled`. With LR-23 this is only reachable by a race.
- **LR-64** *Editing a node while it generates*: forbidden (LR-42).
- **LR-65** *App closing mid-generation*: the app MUST kill the process, discard the partial reply and, if it can still write, record the call with outcome `cancelled`. On the next start nothing resumes; a node that was being lit is `open`.
- **LR-66** *Malformed or empty reply*: a reply with no usable explanation text on *Light up* is an error (LR-4). A malformed block with usable text keeps the text, adds no nodes, and offers *More options* ([tutor-protocol](/specs/tutor-protocol.md) TP-34).
- **LR-67** *Unknown option kind or missing kind*: the child takes the fallback kind (`axis` under the root's intro, `deeper` otherwise).
- **LR-68** *Provider missing or logged out*: generative actions are disabled with the fix-it message of the provider settings; browsing and non-generative edits keep working.

# Open

None for v0.1.0.

Related: [domain-model](/specs/domain-model.md), [tutor-protocol](/specs/tutor-protocol.md), [context-assembly](/specs/context-assembly.md), [product-scope](/specs/product-scope.md), [learn-room-prompts](/components/learn-room-prompts.md), [tagged-blocks-protocol](/decisions/tagged-blocks-protocol.md), [rooms-have-spaces](/decisions/rooms-have-spaces.md).
