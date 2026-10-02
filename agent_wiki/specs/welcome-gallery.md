---
type: Spec
title: Welcome and Gallery
description: The Learn room's two library spaces - Welcome (start or continue a subject) and Gallery (browse all subjects with stats) - and the progress definitions both share.
tags: [welcome, gallery, library, progress, learn-room]
status: stable
generated: { by: claude-code/sonnet-5.5, at: 2026-10-02T11:00:00Z }
verified: { by: "human:alex", at: 2026-10-02T12:00:00Z }
---

Source: spec workshop rounds 1–3 (2026-10-01/02). Agreed with the user 2026-10-02 (q-r3-review).

Two of the three spaces of the Learn room ([rooms-spaces](/specs/rooms-spaces.md)); the third is
Study ([graph-view](/specs/graph-view.md), [node-panel](/specs/node-panel.md)). Subjects come
from the library folder ([subject-storage](/specs/subject-storage.md)); the data model is
[domain-model](/specs/domain-model.md). Successor of the PoC `Home.svelte`, which mixed both
roles in one column.

# Welcome

**The visual design of Welcome comes from an `agent_design` component named `welcome`, designed
before it is implemented.** This spec fixes content and behaviour only; layout, type, colour and
motion are the component's final recipe, and no Welcome UI is built before that recipe exists.

## Contents

- **WG-1** Welcome MUST contain, in reading order:
  1. **The subject field**: one single-line input, front and centre, placeholder *What do you
     want to learn?* (a one-line example may follow), focused on arrival.
  2. ***Suggest 3 subjects***: a secondary action beside or under the field.
  3. **The tone picker**: the tone applied to the new subject (ELI5, Curious, Student, Engineer,
     Expert, or Custom with a free-text field). Its initial value is the Learn room default
     tone ([settings](/specs/settings.md)); changing it here does not change that default.
  4. **The 3 most recent subjects** as large cards (WG-5).
  5. ***Browse all***: opens Gallery; shows the total count (*Browse all 14*).
- **WG-2** The model and effort of the new subject MUST be the app defaults from Settings →
  Provider; they are changed later from the subject menu ([rooms-spaces](/specs/rooms-spaces.md)
  RS-15), not on Welcome.

## Behaviour

- **WG-3** *Submit* (Enter in the field, or the primary button *Carry the lantern in*) with a
  non-blank title MUST: create the subject with that title and the chosen tone; write its file;
  switch to Study; and start the intro generation so that the root node's explanation streams in
  ([node-panel](/specs/node-panel.md) NP-62). Titles are trimmed and limited to 120 characters.
  A blank field disables the button.
- **WG-4** *Suggest 3 subjects* MUST run a `suggest` generation (**not logged** in v0.1.0: there is no
  subject yet, so its tokens are in no total) and show 3 chips (title, hook) under the field.
  Choosing a chip fills the field, it does not submit. While running, the button reads *Thinking
  of subjects…* and is disabled; on error, an inline message with *Retry* appears
  ([node-panel](/specs/node-panel.md) NP-90 style). The 3 chips are replaced on each new request.
- **WG-5** A **recent card** MUST show exactly: **title**; **mini graph thumbnail** (WG-40);
  **understood / total** (WG-30, e.g. *4 / 21*); **last opened** (from the app-side state, WG-35; relative: *today*, *yesterday*,
  *3 days ago*, else a date; exact time in the tooltip); and a **Continue** button. Clicking the
  card or *Continue* opens the subject in Study with its last focus restored.
- **WG-6** The cards MUST be the 3 subjects with the latest last-opened time in the app-side state (WG-35), newest first; fewer
  than 3 subjects show fewer cards, with no placeholders. A subject opened from anywhere moves
  to the front.
- **WG-7** *Browse all* MUST open Gallery (same as Ctrl+3). It is hidden when there are no
  subjects.
- **WG-8** The Escape key on Welcome clears the field; Tab order follows reading order (WG-1).

## Empty and error states

- **WG-12** *First run, no subjects.* Welcome shows the field, *Suggest 3 subjects* and the tone
  picker, a one-sentence welcome (*Bring a subject. The tutor lights it one node at a time; you
  choose where to go next.*), no recent cards and no *Browse all*. The header's Study and
  Gallery icons are disabled ([rooms-spaces](/specs/rooms-spaces.md) RS-11).
- **WG-13** *CLI not ready.* When the provider status is not ready, the field stays editable
  but submit and *Suggest 3* are disabled, with the inline text *The Claude Code CLI is not
  ready. Fix it in Settings → Provider.* and a link to that page; the frame banner (RS-40) is
  shown too. Recent cards still open: reading and browsing work without the CLI.
- **WG-14** *Library folder unavailable.* Per RS-41 the field is disabled and no cards are shown;
  the message of the banner is repeated in place of the cards.

# Gallery

## The grid

- **WG-51** Gallery MUST show every subject as a card in a responsive grid (minimum card width
  260 px, 2 to 5 columns at ≥ 1024 px), under a toolbar with **sort**, **filter** and the count.
- **WG-52** A card MUST show: **title**; **mini thumbnail** (WG-40); **nodes** (total, WG-30);
  **lit**; **understood** with its split (*4 · 3 demonstrated / 1 self*); **tokens spent**
  (WG-31, omitted when "Show token stats" is off); **time span** (*created 12 Sep → last opened
  2 days ago*); and **main model** (WG-32). Understood/total progress is drawn as a thin bar
  under the title using `--node-understood`.
- **WG-53** Sorting: **last opened** (default, newest first), **created** (newest first),
  **progress** (understood / total, highest first). A direction toggle reverses the order. Ties
  fall back to title, A to Z.
- **WG-54** Filter: a text field matching the subject title, case-insensitive substring, applied
  as you type with a 150 ms debounce; Esc clears it. With a filter that matches nothing, the grid
  shows *No subject matches "<text>"* with a *Clear filter* link.
- **WG-55** Sort and filter MUST be kept across space switches for the session and reset on
  restart ([rooms-spaces](/specs/rooms-spaces.md) RS-24).

## Selection and actions

- **WG-60** A single click MUST select a card (focus ring in `--focus`) and reveal **its action
  buttons and its detailed stats** (WG-68); a **double-click** opens the subject in Study.
  Enter opens the selected card. Opening restores the subject's last focus.
- **WG-61** *Rename*: the title becomes an inline input; Enter saves, Esc cancels, a blank title is
  rejected. Renaming never changes the subject's id or file name.
- **WG-62** *Delete*: opens a confirm dialog (WG-63); Delete key on the selected card opens the
  same dialog.
- **WG-63** The dialog MUST name the subject and its numbers: the title, the node count and the tokens spent (*Delete "Tides"? 21 nodes, 48.3k
  tokens of history. The file goes to the Recycle Bin.*) and offer **Cancel** (default focus)
  and **Delete**. **Decision: an explicit confirm button, not a typed title.** Rationale: the
  dialog already names the subject and its size, so a misclick is unlikely; typing the title
  every time is friction for a daily tool; the file is moved to the Windows Recycle Bin, so the
  act stays recoverable outside Lantern.
- **WG-64** *Reveal in Explorer*: opens Windows Explorer with the subject's file selected; if the
  file is missing the card shows an inline error and is removed on the next refresh.
- **WG-65** Keyboard: arrow keys move the selection through the grid in reading order (Left/Right
  within a row, Up/Down between rows, Home/End first/last); Enter opens; **F2** renames; **Del**
  deletes (with the confirm); Esc clears the selection. The grid is one tab stop (roving
  tabindex).
- **WG-66** Deleting the open subject is allowed from Gallery; Study then has no subject, and Ctrl+2
  opens the most recently opened remaining subject (RS-23), or does nothing when none is left. A subject with a running generation MUST show an extra
  line in the dialog (*A generation is running and will be cancelled*) and cancel it before
  deleting.
- **WG-68** *Detailed stats of the selected card.* Selecting a card MUST show, on the card itself (expanded) or in a
  detail area directly under it, without opening the subject: **all the stats of WG-30 and WG-31** (nodes, lit,
  understood with its demonstrated / self split, dark, tokens spent as *in / out*); **created** (the `createdAt` date)
  and **last opened** (date and time, WG-33); **tone** (the preset name, or the start of the custom text); the
  **model(s) used with the output-token share of each** (WG-32, e.g. *Opus 5.5 82% · Sonnet 5.5 18%*, resolved models
  ordered by share, the shares summing to 100%); and the **generation count** (WG-36). Token figures and shares are
  hidden when "Show token stats" is off (WG-34); models, tone and the generation count stay. All figures come from
  the summary cache (WG-35); selecting never reads the full subject file. Only one card is selected at a time;
  Esc or a click on empty space clears the selection and the detail.
- **WG-67** Deleting a subject MUST NOT touch other subjects or the settings; the logs of other
  subjects are unaffected. Its entries leave the app-side state and summary cache ([subject-storage](/specs/subject-storage.md) ST-8).

## Empty state

- **WG-70** With no subjects, Gallery shows *No subjects yet* and a button *Start one* that goes to
  Welcome. Toolbar controls are hidden.
- **WG-71** With a missing library folder, the message of RS-41 replaces the grid.

# Progress definitions

Shared by Welcome, Gallery and the header stats, so that all three show identical numbers. They
are computed from the room visit of the room (`learn`) and never stored
([domain-model](/specs/domain-model.md) DM-31).

- **WG-30** This is the **one definition** of the counts; [rooms-spaces](/specs/rooms-spaces.md)
  (header stats) and [node-panel](/specs/node-panel.md) refer to it. For the Learn room visit's graph:
  **total** (also called **nodes**) = all nodes except `dismissed`; **lit** = nodes in `lit` **or
  `understood`** state; **understood** = nodes in `understood`, split by `understoodBy` into
  *demonstrated* and *self*; **dark** = the `open` nodes, which equals total − lit. Progress is
  understood / total, 0 when total is 0.
- **WG-31** **Tokens spent** = the sum over every record of the generation log, whatever its
  outcome (ok, cancelled, error), of `usage.input + usage.output`. `usage.output` already
  includes thinking tokens, and `cacheRead` / `cacheWrite` are not counted, since they are
  provider overhead (this includes the CLI's own ~13k baseline). Shown as *input in / output out* (*48.3k in / 21.0k out*) with a compact
  unit (k, M) and one decimal. `suggest` calls are not logged, so they are never counted.
- **WG-32** **Main model** = the resolved model id with the greatest sum of `usage.output` over
  the log; ties go to the model of the most recent record; an empty log shows *none yet*. It is
  displayed as a short name (*Sonnet 5.5*).
- **WG-33** **Time span** = the subject's `createdAt` → its last-opened time. **Last opened** is kept
  app-side, not in the subject file (WG-35), and updated on open, not on every edit.
- **WG-35** *Sources.* The last-opened time and the recents list come from the app state
  file `%APPDATA%/Lantern/state.json`, keyed by subject id ([subject-storage](/specs/subject-storage.md) ST-6,
  [settings](/specs/settings.md) SE-50); opening a subject never modifies its file. Every figure of WG-30 to WG-32
  and the title and `createdAt` come from the **app-side summary cache**, keyed by file path and invalidated by
  mtime and size ([subject-storage](/specs/subject-storage.md) ST-7), so no card needs the full file. The same cache
  holds what WG-68 needs: tone, per-model output tokens and the generation count.
- **WG-36** **Generation count** = the number of records in the generation log, whatever their outcome (ok, cancelled,
  error); `suggest` calls are not logged and are not counted. **Model share** = for each resolved model, the sum of its
  `usage.output` divided by the sum of `usage.output` over the whole log, as a whole-number percentage; a log whose
  outputs are all 0 shows no shares.
- **WG-34** All usage numbers MUST be hidden when "Show token stats" is off, except where the
  node author is shown ([node-panel](/specs/node-panel.md) NP-5).

# The mini graph thumbnail

- **WG-40** The thumbnail MUST be a static render of the Learn graph in the **tree layout**
  (depth columns, leaves on rows; the same algorithm as the live tree layout, without physics),
  scaled to fit a 16:9 box, drawn as an inline SVG: nodes as circles filled by state using the
  room tokens (open dotted outline, lit glow, understood solid, dismissed omitted), edges as
  `--path-muted` lines.
- **WG-41** At most **60** nodes are drawn: the root, then breadth-first by depth and creation
  order; when more exist, a final *+n* label is drawn in the corner. Glow is a single drop-shadow
  at card level, not per node. No animation.
- **WG-42** A thumbnail is computed from the subject file when its card first becomes visible (only the
  first 60 nodes of WG-41 are read) and cached in memory, keyed like the summary cache (file path, mtime and
  size); it MUST NOT be stored in the subject file or in the summary cache.
- **WG-43** The subject list MUST be loaded from the summary cache (WG-35), re-reading only the files whose mtime or size changed, so it does not require parsing
  the full dialogue of each subject for display; with up to 50 subjects the first Gallery render
  MUST complete in under 500 ms on a typical laptop.

# Open

- Welcome's look: the `welcome` design component (`agent_design/welcome/`, to be created). It is a design task, not an undecided behaviour.

Related: [rooms-spaces](/specs/rooms-spaces.md), [graph-view](/specs/graph-view.md),
[node-panel](/specs/node-panel.md), [domain-model](/specs/domain-model.md),
[subject-storage](/specs/subject-storage.md), [product-scope](/specs/product-scope.md).
