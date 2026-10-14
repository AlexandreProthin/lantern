# Choose gallery — final design

Selected on 2026-10-15 by explicit user instruction: chat "r004-02 final", and the saved request revision 6 (picks
r001-03, r001-02, r001-01, r002-01, r002-03, r003-01, r004-02; prompt "r004-02 is the one to call final"). Not consumed
by a round; finalization needs none.

- Winner: **r004-02 — Unfold from the band** (motion), on r003-01 (colour), r002-03 at r002-01's card size (form),
  r001-02 + r001-03 + r001-01 (structure). Type: choose-board's final type (round 3 skipped the type round by request).
- Final snapshot: [choose-gallery-fin-r004-02.html](final/choose-gallery-fin-r004-02.html), a byte-exact copy of
  [choose-gallery-mot-r004-02.html](motion/choose-gallery-mot-r004-02.html). Its experiment header stays as provenance.
- Shared files, loaded as `../…` (the same from `final/` as from `motion/`): [choose-gallery-data.js](choose-gallery-data.js)
  (58 subjects and the scenarios), [assets/gallery-kit.js](assets/gallery-kit.js) (model, frame, open / rename / delete,
  keyboard, empty state), [assets/form-structure.js](assets/form-structure.js) (the frozen markup),
  [assets/color-base.js](assets/color-base.js) (tokens, type, form), [assets/gallery-motion.js](assets/gallery-motion.js)
  (motion engine), [assets/backdrop.js](assets/backdrop.js) (a copy of choose-board's final backdrop).
- Prototype controls, not part of the design: the scenario pill (*Empty*, *One subject*, *Typical · 14*, *Many · 58*,
  *Un-choose one*), *Replay arrival* and *Reduce motion* (bottom left), the corner tag. The toasts stand in for the real
  actions (Open goes to Survey, Reveal opens Explorer, *Start one* goes to Welcome).
- **Fix made at finalization (2026-10-15).** The user found that renaming showed a boxed field with the browser's blue
  selection: the wireframe kit's `input.rn` box out-ranked the colour base. `color-base.js` now styles `.card input.rn`
  as the board's inline edit (no box, `--accent` underline, teal selection). This is a shared asset, so r003-0x,
  r004-0x and the final all show the fix; no registered HTML file changed.

## What it is

Learn's Gallery mechanism (WG-51 to WG-68), told in status.

- **Toolbar**: status tabs *All · Exploring · Decided · Bought*, each with its count (counts follow the name filter);
  a name filter (substring, case-insensitive, 150 ms debounce, Esc clears); sort *Last opened* (default) · *Created* ·
  *Status* · *Closest to a decision* · *Name*, a direction toggle; the count (*14*, or *3 of 14* when filtered). Ties
  fall back to the title, A to Z.
- **Card** (all the same size at rest), top to bottom:
  1. the **status band**: the status and *opened <relative date>* (the exact time in the tooltip);
  2. the **title** on one line, ellipsis, full title on hover;
  3. the **steps bar**: four bars *Needs* (answered / total), *Criteria* (ranked / total), *Shortlist* (count, full at
     2), *Pick* (chosen / bought / —), each with its value;
  4. the **pick line**, the largest text on the card: *Chose / Bought* + the product + its price; or *No pick yet* +
     *n missing* (the board's completeness rule, CR-61); or *Ready · the room can recommend*; or, after an un-choose,
     *No pick* + the un-chosen product struck through + *un-chosen 6 h ago*; *· generating…* while a generation runs;
  5. the **CR-25 stats**: *4 needs · 6 criteria · 3 shortlisted* (criteria = every criterion not dismissed;
     shortlisted = shortlisted + chosen).
- **Selecting** (click, arrows) **lifts the card over the grid at card width**; the grid does not move and the other
  cards dim. The lifted card holds: the band, the full title (wraps), the pick with its fact, its price and *seen at
  <source>, <date> — an indication, not a promise* (CR-41) or what is missing; the actions **Open in Survey**,
  **Rename**, **Reveal**, **Delete…**; the **History** as a vertical timeline, newest first (*Marked as bought*, *Chose
  Desk C*, *Un-chose Desk C; exploring again*, *Started exploring*, each with date and time); **Board** (needs answered,
  criteria must / nice / to rank / irrelevant, products shortlisted / candidates / rejected, Compare filled or *n empty
  cells*); the **Direction** when there is one; **Subject** (created, opened, nodes, tone, model, generations, tokens
  in / out). Esc or a click on empty space folds it back.
- **Open**: double-click, Enter or *Open in Survey*; the subject moves to the front under *Last opened*.
- **Rename**: F2 or *Rename*; the lifted title becomes the inline field; Enter saves, Esc cancels, blur saves, a blank
  title is refused (underline in `--error`). 120 characters at most (WG-3).
- **Delete**: Del or *Delete…*, Learn's dialog (WG-63), with Choose numbers: *Delete "Espresso machine"? 33 nodes ·
  5 needs · 7 criteria · 3 shortlisted · chose Machine B, 101.6k tokens of history. The file goes to the Recycle Bin.*,
  plus *A generation is running and will be cancelled.* when one runs (WG-66). Cancel has the focus.
- **Keyboard**: arrows move the selection by position in the grid, Home / End, Enter, F2, Del, Esc (WG-65).
- **Empty**: *No choices yet*, one sentence, *Start one* (to Welcome); no toolbar (WG-70). **No match**: *No subject
  matches "<text>" in decided. Clear filter* / *No bought subject yet. Show all*.
- **Un-chosen** (CR-24): the subject returns to Exploring, its band and steps change, the pick line shows the struck
  product, and the history keeps *Un-chose …*.

## Decisions and ancestry

| Round | Design | Parents | Decision |
| --- | --- | --- | --- |
| 1 wireframe | r001-02 Learn's grid, told in status | none | **Kept**: the grid, toolbar and card slots. |
| 1 wireframe | r001-03 Ledger with a side sheet | none | **Kept**: the status history as a vertical timeline (from its side sheet). Not kept: the table and the sheet. |
| 1 wireframe | r001-01 Status lanes | none | **Kept**: the card unfolds in place at card width. Not kept: the three lanes, the receipts. |
| 2 form | r002-03 Outcome first | r001-03, r001-02, r001-01 | **Kept**: status band, pick line as the hero, steps bar, the lifted card over a still grid. |
| 2 form | r002-01 Quiet shelf | r001-03, r001-02, r001-01 | **Kept**: its card size (min 300 px, 24 px gutters, 40 px margins). Not kept: r002-02 Dense index. |
| 3 colour | r003-01 Teal states | r001-0x, r002-01, r002-03 | **Kept**. Not kept: r003-02 Ink first, teal for decisions; r003-03 Node light. |
| 4 motion | r004-02 Unfold from the band | r001-0x, r002-01, r002-03, r003-01 | **Final.** Not kept: r004-01 Quiet fades; r004-03 Lantern light. |

## Verbatim inputs

| Round | Saved request (revision, picks, phase, mode, prompt) |
| --- | --- |
| 1 | rev 1, none, wireframe, combine: *Gallery space of the Choose room (CR-11, CR-12, CR-24, CR-25, CR-14; Learn's Gallery in welcome-gallery WG-51 to WG-71): the list of all Choose subjects with their status (exploring → decided → bought), what each entry shows (e.g. the chosen product, compact stats like "4 needs · 6 criteria · 3 shortlisted", last opened), and how you sort, filter by status and open, rename or delete a subject. Hard cases: empty, one subject, many (50+), several bought, long names, a decided subject whose product is later un-chosen. Welcome's recent cards and Gallery should look like one family (choose-welcome, designed in parallel).* (written by the agent from the user's chat brief) |
| 2 | rev 3, r001-03 r001-02 r001-01, form, combine: *r001-02 with the history of r001-03 from its right side pannel in place of the mini graph view from an unfolded card of r001-01. Selecting a card opens not in full-width but card width* |
| 3 | rev 4, + r002-01 r002-03, color, combine: *r002-03 but r002-01 card size. We skip Type round, just take the same as the one we already selected from the choose-board design. next step color* |
| 4 | rev 5, + r003-01, motion, combine: *go motion* |
| final | rev 6, + r004-02: *r004-02 is the one to call final*; chat: *r004-02 final. note: see the image for a glitch i found* (the rename field, fixed above) |

How they were read: round 2's structural changes were applied once as the frozen structure of the form round (as in
Welcome's round 2), the board thumbnail kept on resting cards; round 3's card size was applied once and the type was
choose-board's; no colour input was given, so the palette is the accepted Choose palette (CR-70) and the round varied
where the teal falls; no motion input, bounded by RS-33 and GV-100 to GV-103.

## Form (r002-03 at r002-01's size)

- Page: toolbar 24 px × 40 px padding, 14 px gaps; grid 8 px × 40 px (130 px at the bottom for the lifted card).
- Grid: `repeat(auto-fill, minmax(300px, 1fr))`, 24 px gaps, 4 columns from 1500 px; one column under 640 px with
  16 px margins and gaps.
- Card: 12 px radius, glass, 12 px between slots, 20 px inner margins; band 8 px × 20 px; stats over a hairline (10 px).
- Lifted card: 10 px above and 12 px wider on each side than the card, 14 px radius, band 10 px × 22 px, 22 px inner
  margins, 18 px between sections, each section over a hairline (12 px); the other cards at 45% opacity.
- Steps bar: four equal columns, 8 px apart, 4 px bars with 2 px radius.

## Type (choose-board r003-01)

`--font-text` Segoe UI Variable Text, `--font-display` Segoe UI Variable Display, `--font-small` Segoe UI Variable Small,
each falling back to `'Segoe UI', system-ui, sans-serif`. Sentence case, no extra tracking. Scale `--step--1 … --step-6`
= 11 / 12 / 13 / 15 / 18 / 24 / 30 / 38 px.

| Element | Face | Weight | Size / leading |
| --- | --- | --- | --- |
| Pick line (product, *n missing*, *Ready*) | Display | 600 | 18 / 1.25 |
| Pick verb (*Chose*, *No pick yet*) | Small | 400 | 11 |
| Price on the pick line | Text | 400 | 13 |
| Card title | Text | 400 | 13 / 1.45 |
| Status band, steps labels and values, stats | Small | 600 (status) / 400 | 11, tabular figures |
| Lifted title and the rename field | Display | 350 | 24 / 1.1 |
| Lifted pick product / price / fact / source | Display 600 18 / Text 15 / Text 12 / Small 11 | | |
| Section labels | Small | 600 | 11 |
| Timeline entries / their dates | Text 13 / Small 11 | | |
| Board and subject lists | Text 12 / 1.65 (labels in Small) | | |
| Tabs, buttons, sort | Small | 400 (selected tab 600) | 12 |
| Delete dialog title, empty title | Display | 350 | 24 |

## Colour (r003-01, Choose palette tokens only)

Tokens: the accepted Choose palette (CR-70) with choose-board's helpers `--glass`, `--glass-line`, `--glass-blur`,
`--ink-faint`, plus `--line-strong = color-mix(--line 65%, --ink-mute)`. Glass over the backdrop (`lx:screen` gallery).

| Element | Token |
| --- | --- |
| Header | glass; *Choose* and the current space `--accent` |
| Selected status tab | `--accent` fill, `--accent-ink` text (600); other tabs `--ink-mute`, counts `--ink-faint` |
| Status dots | exploring: dashed `--accent` ring; decided: `--focus` ring; bought: solid `--accent` |
| Band, exploring | `--accent` text, `--accent` 35% hairline under it |
| Band, ready (exploring, board complete) | + `--accent` at 18% fill |
| Band, decided | `--surface-2` fill, `--focus` text (date at 70%) |
| Band, bought | `--accent` fill, `--accent-ink` text (date at 75%) |
| Card | `--glass`, `--glass-line` border, `--accent` 35% border on hover |
| Steps bar | track `--ink` 6%; partial `--accent` 55%; full `--accent` |
| Pick line | `--ink` (verb `--ink-faint`, price `--ink-mute`); *Ready* `--accent`; un-chosen product struck in `--ink-mute` |
| Lifted card | `--surface` 92% + blur, border `--accent` 50%, halo `0 0 40px 6px --glow-far`, shadow from `--code` |
| *Open in Survey* | `--accent` fill, `--accent-ink` text, `--focus` on hover; other actions outlined `--line`, *Delete…* hover `--error` / `--error-ink` |
| Section labels | `--accent` |
| Timeline | line `--line`; started `--node-open` ring; chose: `--focus` 2 px ring on `--surface-2`; bought: `--accent` dot; un-chose: dashed `--ink-mute` ring |
| Rename field | transparent, `--accent` underline with a `--glow-near` shadow, caret `--accent`, selection `--accent` 38%; blank: `--error` underline |
| Filter field | `--glass`, `--line` border, `--accent` on focus |
| Delete dialog | `--surface`, `--line`; *Delete* `--error` fill, `--code` text; the running-generation line `--error-ink` |
| Focus ring | 2 px `--focus` |

Contrast is the accepted palette's (accent-ink on accent 8.18, accent on glass 8.26, focus on bg 13.94); decided band:
`--focus` on `--surface-2`.

## Motion (r004-02, choose-board's language)

Easing: out `cubic-bezier(.2,.7,.2,1)`, in `cubic-bezier(.5,0,.8,.4)`. Event-driven only; nothing loops.

| Event | Motion |
| --- | --- |
| Arrival in Gallery | cards rise 12 px and fade in, 280 ms out, in reading order 30 ms apart (capped at the 12th); each steps bar then fills from the left (`scaleX`), 360 ms, 200 ms after its card |
| Sort, filter, delete, Open moving a card to the front | cards glide from their old place (FLIP), 280 ms out |
| A card enters (filter widened) | grows from 96% and fades in, 220 ms out, 25 ms apart |
| A card leaves (filter narrowed, delete) | shrinks to 96% and fades out, 200 ms in |
| Select (lift) | the lifted card unfolds downward from its status band, `clip-path` 320 ms out; the title and each section slide 12 px down into place and fade in, 220 ms, from 120 ms, 40 ms apart |
| Fold | closes back up into the band and fades, 240 ms in (removed after at most 450 ms) |
| Status change | the band fills from the left, `clip-path` 360 ms out (as a chosen product's card on the board) |
| A tab count changes | rolls up from 60% below, 280 ms out (as the rail's counters) |
| Open (handoff to Survey) | a `--accent` ring spreads 14 px from the card and fades, 360 ms out |
| Dimming of the other cards | opacity, 200 ms |

- **Timer-driven safety**: every animation is finished by a timer at its end time + 80 ms, so a hidden or throttled
  window (paused timeline) never leaves a card clipped, faded or a fold copy on screen (the class of bug Welcome's
  recipe met).
- **Reduced motion** (OS setting or Appearance → Always reduce, GV-100): every change is instant, no hook runs
  (GV-101). Nothing is conveyed only by motion (GV-103).

## For the implementation

- **Specs**: [choose-room](../../agent_wiki/specs/choose-room.md) CR-12 and CR-24 record the Gallery. Learn's Gallery
  rules apply unless stated here: sort and filter kept for the session (WG-55), rename (WG-61), delete and its dialog
  (WG-62, WG-63, WG-66, WG-67), Reveal (WG-64), keyboard (WG-65), empty state (WG-70, WG-71), summary-cache sources and
  the 500 ms render budget for 50 subjects (WG-35, WG-43).
- **Differences from Learn's Gallery**: a status filter (tabs) instead of only a text filter; sorts *Status* and
  *Closest to a decision* instead of *progress*; the steps bar instead of the graph thumbnail (WG-40), so no subject
  file is read for a card; selection lifts the card (WG-68's "on the card itself") instead of a detail area.
- **Summary cache** needs, per Choose subject: status and its history (status, time, product, un-chosen), the chosen
  product (name, one fact, price, price source and date), counts of needs answered / total, criteria by state, products
  by state, empty Compare cells for shortlisted × must, and Learn's figures (nodes, tokens, model, tone, generations,
  running).
- **Closest to a decision**: decided and bought after exploring; within exploring, fewer missing items first.
- **Family with Welcome**: choose-welcome's r001-01 also draws a four-step decision bar on its recent cards; when
  Welcome is finalized, its cards should use this card's band, steps bar and pick line.
