---
type: Spec
title: Node panel
description: The Study space's reading side - layout, per-state behaviour, editing with previous version, selection popover, markdown rendering and safety, streaming, errors and the delete dialog.
tags: [panel, reading, editing, markdown, streaming, provenance, study]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-02T11:00:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Source: spec workshop rounds 1–3 (2026-10-01/02). Agreed with the user 2026-10-02 (q-r3-review).

The right side of Study; the graph side is [graph-view](/specs/graph-view.md), the frame is
[rooms-spaces](/specs/rooms-spaces.md). The panel shows **the focused node** (GV-80) and is the
only place where a node is read, edited, lit, questioned or deleted. Builds on the PoC
`Panel.svelte`. Data: [domain-model](/specs/domain-model.md); wire protocol:
[tagged-blocks-protocol](/decisions/tagged-blocks-protocol.md).

# Layout, top to bottom

One scroll area holds everything except the composer, which is pinned at the bottom.

- **NP-1** The panel MUST contain, in this order: (1) breadcrumbs; (2) meta line; (3) title and
  hook; (4) explanation; (5) *Where to go next*; (6) the *Dismissed (n)* fold; (7) actions; (8)
  dialogue; (9) the composer (pinned). Sections with nothing to show are absent, not empty.
- **NP-2** **Breadcrumbs**: the path from the root to the parent, each a button that focuses that
  node, separated by `›`; the current node is not repeated. The root shows an empty line of
  the same height.
- **NP-3** The **meta line** MUST show: *kind · state* (kind as a label: subject, axis, go deeper,
  application, adjacent idea, exercise, from a question, own) with the state as a chip using the
  node-state tokens (understood shows *demonstrated* or *self-declared*); and, after it, the
  provenance (NP-4).
- **NP-4** Provenance format: *Sonnet 5.5 · medium · 3.2k in / 1.1k out · 24 s*: short model
  name from the resolved id, effort, input and output tokens of the generation that wrote the
  content (compact k/M, one decimal), duration (*24 s*, *1 min 12 s*). When the content was edited
  the line ends with *· edited by <name>*. Content the user wrote reads *written by <name>*.
  Nodes with no content yet show no provenance. These are per-generation figures only; the subject totals and the lit / dark / understood counts are defined once, in [welcome-gallery](/specs/welcome-gallery.md) WG-30 and WG-31.
- **NP-5** With **Show token stats** off, tokens and duration MUST be hidden and the **author
  stays**: *Sonnet 5.5 · medium · edited by Alex* ([welcome-gallery](/specs/welcome-gallery.md) WG-34).
- **NP-6** **Title and hook** show as a heading (24 px, weight 600) and an italic muted line; both
  are editable (NP-40). An empty title renders *Untitled question*; an empty hook shows nothing.
- **NP-7** **Explanation**: the node's `content` as rendered markdown (NP-70 and following) with
  *edit* affordance (NP-41). While streaming it renders the partial text (NP-60).
- **NP-8** *Where to go next* lists the children (the root's heading is *Axes to explore*): one
  row per child with title, hook and a badge (kind for open children, otherwise the state);
  creation order. A click only **focuses** the child, also for an **open** one; lighting it needs *Light it up* or Enter, as in the graph
  ([learn-room](/specs/learn-room.md) LR-80). While a light-up or *More options* is pending, three skeleton rows stand
  in for the children.
- **NP-9** The **dismissed fold** *Dismissed (n)* appears only when n > 0, collapsed by default; each
  row shows title and hook, a *Restore* button, and focuses the node on click.
- **NP-10** The **actions** row holds *More options*, *Rewrite explanation* and *Add my own node* (NP-31, NP-35, NP-32) and an
  overflow menu (*⋯*) with *Dismiss* (open nodes only) and *Delete* (NP-100).
- **NP-11** The **dialogue** section (*Dialogue*) lists turns in order: learner turns right-indented
  on `--surface-2`, tutor turns with a 2 px `--accent` left border; each **tutor** turn can be edited
  (NP-42) and shows its author on hover (*tutor: Sonnet 5.5 · medium*, *you: Alex*).
- **NP-12** The **composer** is a textarea of 2 rows, growing to 8; placeholder *Ask about this, or
  answer the tutor… (Ctrl+Enter to send)*. **Enter** inserts a newline, **Ctrl+Enter** sends (keys: [graph-view](/specs/graph-view.md) GV-76). Buttons:
  **Send**, **Test me**, **I get it** / **Not sure anymore**, and **Cancel** while streaming
  (NP-14). Drafts are kept per node for the session.
- **NP-13** Focusing a node scrolls the panel to the top; the scroll area MUST keep 28 px side
  padding and a maximum text measure of about 75 characters.
- **NP-14** While a generation runs on this node, **Send** is replaced by **Cancel**; the other
  buttons and the textarea are disabled. Esc cancels it (shortcut table:
  [graph-view](/specs/graph-view.md) GV-76). Cancel discards the partial reply, restores the node's
  previous state and logs the call as *cancelled*.

# The panel per node state

| State | Content shown | Composer and buttons | Other actions |
|---|---|---|---|
| **open** | Title, hook, and the dark state: *This node is still dark.* with the primary button **Light it up**. No explanation, no dialogue. | **No composer.** | *Dismiss*, *Delete*. |
| **lit** | Everything of NP-1. | Composer, Send, Test me, **I get it**. | *More options*, *Rewrite explanation*, *Add my own node*, *Delete*. |
| **understood** | As lit; the meta chip reads *understood · demonstrated* or *· self-declared*. | Composer, Send, Test me, **Not sure anymore** (returns to lit, clears `understoodBy`). | As lit. |
| **dismissed** | **Read-only**: title, hook, a notice *Dismissed. It will not be proposed again.* with **Restore**. No pencil icons. | No composer. | *Delete*. *Restore* returns the node to open. |
| **busy** (a generation is running on this node) | As its state, streaming at the target place; edit affordances hidden on the streaming section. | Cancel only (NP-14). *Light it up* shows *Lighting…* (disabled). | All disabled. Other nodes can still be browsed and read, but their start controls are disabled, with a tooltip, until the generation ends (NP-20). |

- **NP-20** One generation runs at a time **per subject**. If the busy node is not the focused one,
  the panel of the focused node can be read and its non-generative actions are usable, but *Light it up*, *More options*, *Send* and *Test me* are disabled, with a tooltip saying a generation is running; returning to the busy node shows the live stream.
- **NP-21** *Light it up* MUST be disabled with a tooltip when the provider is not ready
  ([rooms-spaces](/specs/rooms-spaces.md) RS-40).
- **NP-22** An `understood` state set by **I get it** records `understoodBy: self`; one set by
  the tutor's `<understood/>` in reply to *Test me* records `demonstrated`. The tutor MAY emit it only in reply to
  *Test me*; elsewhere the tag MUST be ignored.

# Actions

- **NP-30** *Light it up* (open node) starts the `light` generation: 3 options always; the node
  streams its explanation; spawn animation per [graph-view](/specs/graph-view.md) GV-90.
- **NP-31** *More options* adds **3 new open children** and never replaces existing ones; the tutor
  sees all children including dismissed ones and must propose different directions.
- **NP-35** *Rewrite explanation* (2026-10-23) opens a short inline form under the explanation: one optional line, *What should change?* (300 characters max), with **Rewrite** and **Cancel**; Enter submits, Esc cancels. The new text streams in place of the old one, with *Cancel* keeping the old text; on success *Previous version* compares the two and can revert ([learn-room](/specs/learn-room.md) LR-45, [domain-model](/specs/domain-model.md) DM-16). The node menu's *Rewrite explanation* opens the same form.
- **NP-32** *Add my own node* opens an inline form under the actions: **Title** (required, one
  line, 120 characters max) and **Hook** (optional, 200 characters max), as in [learn-room](/specs/learn-room.md) LR-20. Enter in the title submits; Esc cancels.
  It creates an open child, kind `own`, author = the user's display name, which is lit like any
  other node. Focus stays on the current node; the new node grows in the graph (one placeholder,
  GV-90 style).
- **NP-33** *Dismiss* (open nodes only) moves the node to the parent's *Dismissed (n)* fold and
  fades it in the graph; no confirmation, since *Restore* undoes it. A dismissed node is never
  re-proposed.
- **NP-34** *Test me* asks the tutor for one check question (`check` task); the answer goes through
  the composer.

# Editing

All edits are local and **never trigger a generation**. The tutor treats the learner's
corrections as truth.

- **NP-40** *Title and hook* have a pencil on hover and on keyboard focus; edit mode replaces
  both with two inputs (title single-line, hook up to 2 lines), **Save** and **Cancel**.
  Ctrl+Enter or Enter in the title saves; **Esc cancels** and discards the change. A blank title is rejected. Title and hook edits keep **no previous version** (DM-16); they only gain the *edited by* mark.
- **NP-41** The *explanation* edits in place as a **markdown textarea** with **Save** / **Cancel**,
  monospace, auto-growing to at most 60 % of the panel height, then scrolling. **Esc cancels**;
  Ctrl+Enter saves. The textarea is initialised with the raw markdown (links `node:<id>` included).
- **NP-42** *Tutor dialogue turns* edit the same way. **Learner turns are not editable** (LR-28). Editing a
  turn never deletes the turns after it.
- **NP-43** Saving an edit sets `edited: {by: <display name>, at}`. Only **model-written text** keeps a previous version: the explanation and each tutor turn. The first edit stores the model's original text in `previous`; further edits do not
  overwrite it, so revert always returns to the model's text (domain-model DM-16). The edit is saved with the subject
  ([subject-storage](/specs/subject-storage.md)).
- **NP-44** *Previous version*: an edited explanation or tutor turn shows, in its meta line, **edited by <name> ·
  Previous version**. The link opens a compare view of **Previous | Current** rendered side by
  side (stacked below 520 px) with **Revert to previous** and **Keep current**. Revert restores the
  model text, removes `edited` and clears `previous`. Undo of other kinds is Later.
- **NP-45** While a section is in edit mode, a generation that would replace it (re-light) is
  disabled; leaving the node with unsaved edit text asks nothing and keeps the draft for the
  session (as the composer draft).

# Text selection popover

- **NP-50** Selecting text (at least 2 characters) inside the explanation or the dialogue MUST
  show a small popover above the selection with **Ask about this** and **Make it a node**. It does not
  appear in edit mode, inside code blocks' line gutters, on dismissed nodes or in the composer.
- **NP-51** *Ask about this* puts the quote into the composer as `> quote` (each line of a multi-line
  selection prefixed, followed by a blank line), appends it if the composer has text, and focuses
  the composer. Disabled with a tooltip while busy.
- **NP-52** *Make it a node* creates an open `own` child of the current node. The **title is the
  selection**, whitespace collapsed, trimmed, at most **80 characters**. A longer selection becomes the **hook**
  (at most 200 characters, ellipsis) and the user is asked for a title in a one-line dialog
  prefilled empty. It is disabled on the open and dismissed states.
- **NP-53** The popover closes on Esc, a click elsewhere, scroll, or a changed selection, and is
  also reachable by keyboard: with a selection present, **Alt+A** asks and **Alt+N** makes a node
  (table in [graph-view](/specs/graph-view.md) GV-76). Bold key terms keep the `--focus` colour as in the PoC.
- **NP-54** *(Added 2026-10-16, spec workshop round 9.)* The popover's third button is **Ask Amber**
  (**Alt+D**): a definition or more information about the selection, on Amber's model, in a card
  anchored to the selection, not saved; the card offers *Ask the tutor*, which does what NP-51 does.
  It works the same with Amber off. Behaviour in [companion](/specs/companion.md) CO-45.

# Streaming display

- **NP-60** While text streams, the partial markdown is rendered with a blinking block cursor
  `▍` in `--accent` after the last element (1 s step blink; static under reduced motion). Tagged
  blocks (`<options>`, `<branch>`, `<understood/>`, a partial tag at the end) MUST be hidden from the
  display ([tagged-blocks-protocol](/decisions/tagged-blocks-protocol.md)).
- **NP-61** The panel MUST follow the stream (scroll to the bottom) **only if the user was already at the
  bottom** (within 48 px) when the text arrived; a user who has scrolled up is not moved, and a
  *Jump to latest ↓* pill appears at the bottom until they return.
- **NP-62** On subject creation the root node is lit with the `intro` task and its explanation streams
  into the panel as it arrives, with the root's children placeholders in the graph.
- **NP-63** Incomplete constructs during streaming (an open `$$`, an open ``` ```mermaid ``` fence)
  MUST show as plain text or code until closed, then re-render; layout shift is limited to the
  growing block.

# Markdown rendering

- **NP-70** The renderer MUST support, in explanations and dialogue: **KaTeX** inline `$…$` and
  block `$$…$$` (Pandoc's rule: an opening `$` is followed by a non-space, a closing `$` follows a
  non-space and is not followed by a digit, so `$1/r^2$` is math and *between $5 and $10* stays
  text; changed in v0.1.1 B5, previously a `$` before any digit was refused; render
  errors show the source in `--error` with the message in the tooltip); **Mermaid** diagrams from
  ```` ```mermaid ```` fences; **syntax highlighting** of fenced code by its language tag (and a
  copy button on hover); **tables**; and the usual headings, lists, emphasis (bold in `--focus`),
  block quotes and inline code.
- **NP-71** Links: `[label](node:<id>)` MUST focus that node (and pan the graph, GV-34); an unknown id
  renders as plain text, never as an error (DM-22). `http` and `https` (and `mailto`) links
  MUST open in the system browser, never inside the app window; every other scheme is rendered as
  plain text.
- **NP-72** Safety: the output MUST be sanitised (an allow-list sanitiser such as DOMPurify) after rendering;
  raw HTML in markdown is **not** executed and appears as escaped text; no scripts, event handlers, iframes
  or `style` attributes. KaTeX runs with `trust: false`; Mermaid runs with `securityLevel: strict`
  and its SVG is sanitised: Mermaid's own stylesheet MUST be kept (without it every shape and label
  draws black, v0.1.1 B1), and only CSS that could reach outside the document is neutralised
  (`url()` other than a same-document `#fragment`, `@import`, `expression(`, CSS escapes). Remote images MUST NOT be loaded (alt text and a link are shown),
  (privacy).
- **NP-73** Mermaid diagrams render only once their fence is closed and the stream has ended; they
  take the room tokens for colours; a syntax error shows the source with *Diagram could not be
  drawn*.
- **NP-74** Rendering of a large text MUST NOT block input for more than 50 ms per update during
  streaming (batch updates to animation frames).

# Errors

- **NP-90** A failed generation MUST show an inline **error card** in the panel at the place of the output:
  the heading *The tutor could not answer.*, the provider's message verbatim in a monospace block
  (collapsed beyond 6 lines with *Show more*), and a **Retry** button that repeats the same task
  for the same node. The partial output is discarded, the node returns to its previous state, the
  call is logged as *error*, and spawn placeholders shrink back (GV-93).
- **NP-91** When the CLI reports that the user is **not logged in** (or is missing), the card MUST
  read *You are not logged in to the Claude Code CLI. Open Settings → Provider to fix this.*
  with a link opening that page, which holds the step-by-step instructions
  ([settings](/specs/settings.md) SE-47); Retry stays available once the status is ready. Lantern does not
  open the sign-in for the user in v0.1.0 ([decision](/decisions/cli-signin-instructions-only.md)).
- **NP-92** The card is dismissible and is cleared by a successful generation or a focus change
  back and forth; errors are never stored in the subject.

# Delete confirm

- **NP-100** *Delete* (overflow menu; not offered on the root, tooltip *The root cannot be deleted;
  delete the subject in Gallery*) opens a modal with: the heading **Delete this node?**; *"<title>"
  and its <n> descendants (<n+1> nodes in all) will be removed.*; a second line when understood
  nodes are lost (*<k> understood nodes will be lost.*); a line *A generation is running here and will be cancelled.* when one runs in the subtree; *Their generation records stay in the log.
  This cannot be undone.*; buttons **Cancel** (default focus, Esc) and **Delete**.
- **NP-101** Deleting removes the node and its whole subtree, moves focus to the parent, and keeps the
  log. If a generation runs on a node of the subtree, it is cancelled first and logged *cancelled* ([learn-room](/specs/learn-room.md) LR-23).

# Open

None for v0.1.0.

Related: [graph-view](/specs/graph-view.md), [rooms-spaces](/specs/rooms-spaces.md),
[welcome-gallery](/specs/welcome-gallery.md), [domain-model](/specs/domain-model.md),
[subject-storage](/specs/subject-storage.md), [learn-room-prompts](/components/learn-room-prompts.md).
