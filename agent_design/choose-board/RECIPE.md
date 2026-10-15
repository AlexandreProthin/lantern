# Choose decision board — final design

Selected on 2026-10-14 by explicit user instruction in chat: "choose-board-mot-r005-02.html is the one to lock for final".

- Winner: **r005-02 — Unfold from the spine** (motion), on r004-03 (colour), r003-01 (type), r002-01 (form), r001-01 (structure).
- Final snapshot: [choose-board-fin-r005-02.html](final/choose-board-fin-r005-02.html), a byte-exact copy of
  [choose-board-mot-r005-02.html](motion/choose-board-mot-r005-02.html). Its experiment header stays as provenance.
- Shared files, loaded as `../…` (same from `final/` as from `motion/`): [choose-board-data.js](choose-board-data.js)
  (scenarios), [assets/board-kit-color.js](assets/board-kit-color.js) (state rules and the Survey frame in the room
  tokens), [assets/rail-structure.js](assets/rail-structure.js) (the board's markup and behaviour, frozen from r001-01),
  [assets/board-motion.js](assets/board-motion.js) (motion hooks), [assets/backdrop.js](assets/backdrop.js).
  Prototype controls, not part of the design: the scenario pill (bottom left), *Settle the next thing* and *Reduce
  motion* (bottom right), the corner tag, and the reading panel's placeholder lines.
- Saved request: revision 7 also checked r004-02 *Node light*; the user corrected it in revision 8 (picks r001-01,
  r002-01, r003-01, r004-03, the winner's line). r004-02 is not part of the final. Neither revision was consumed by a
  round; finalization needs none.

## What it is

A **counter rail** between the graph and the reading panel, in place of the divider: always visible, four counters
(needs answered / total, must criteria with the nice count, shortlisted, the pick), the subject status, how many things
are missing and **Recommend**. A dot on a counter means something is missing there; hovering it lists what. A click
opens the **board in place of the graph**, full height (the panel never moves): a header with the status, Recommend and
*Back to graph* (Esc too), the missing items as one line (with *Fill Compare* when cells are empty), two columns (needs
card | criteria grouped Must / Nice to have / To rank / Irrelevant with must·nice·irr. toggles), and the shortlist and
pick below as rows (shortlist, reject, choose, un-choose, *Mark as bought*; rejected products listed with their reason).

## Decisions and ancestry

| Round | Design | Parents | Decision |
| --- | --- | --- | --- |
| 1 wireframe | r001-01 Counter rail | none | **Kept**: the structure above. Not kept: r001-02 Journey band (stations over the graph, columns drop-down), r001-03 Next step (wide left column acting on the next missing item). |
| 2 form | r002-01 Quiet numerals | r001-01 | **Kept**: low density, hierarchy by scale; 88 px rail, large light numerals, space instead of rules, a dot left of a missing counter's numeral; airy sheet (32/40 px padding), question-over-answer needs, large group names, products as wide rows, one vertical hairline between the columns. Not kept: r002-02 Dense ledger, r002-03 Tonal panes. |
| 3 type | r003-01 Display numerals, sentence case | r001-01, r002-01 | **Kept**: the app's own type moves. Not kept: r003-02 One face, r003-03 Hairline numerals. |
| 4 colour | r004-03 Teal spine | r001-01, r002-01, r003-01 | **Kept**: teal carries the board. Not kept: r004-01 Ink, teal for decisions; r004-02 Node light. |
| 5 motion | r005-02 Unfold from the spine | r001-01, r002-01, r003-01, r004-03 | **Final.** Not kept: r005-01 Quiet fades, r005-03 Lantern light. |

## Verbatim inputs

| Round | Saved prompt (picks, phase, mode) |
| --- | --- |
| 1 | Decision board in Survey (CR-10, CR-14): a slim strip next to the graph, always visible, with a few counters and what is still missing before a decision; a click opens it full height; the reading panel stays for nodes. It collects the needs card (editable at any time, CR-31), the criteria ranked must / nice / irrelevant (CR-21, CR-23), the shortlist and the pick (CR-22), the subject status exploring / decided / bought (CR-24), and when it looks complete it offers the recommendation (CR-61; what counts as complete is decided here). Hard cases: a new subject with nothing settled, a nearly complete board, a long needs list, a chosen product, bought. (none, wireframe, combine; written by the agent, saved unchanged by the user) |
| 2 | accepted (r001-01, form, combine) |
| 3 | r002-01, next is type. (r001-01, r002-01, type, combine) |
| 4 | (empty) (r001-01, r002-01, r003-01, color, combine) |
| 5 | (empty) (r001-01, r002-01, r003-01, r004-03, motion, combine) |

How the inputs were read: "accepted" = the structure and the completeness rule of round 1 are accepted. Type: no input;
RS-30 keeps typography shared by rooms, so only the app's families were used. Colour: no input; the palette is the
accepted Choose palette (CR-70), so the round varied how the board uses its tokens. Motion: no input; bounded by RS-33,
GV-100, GV-101 and GV-103.

## Completeness (CR-61)

The board is **complete** when all hold; it then offers the recommendation (Recommend filled; the status chip reads
*ready*):

1. every need is answered;
2. at least one criterion is `must` and none is still `open`;
3. at least two products are shortlisted, or one is chosen;
4. no Compare cell is empty for the shortlisted products × must criteria.

Missing items, in this order: *Tell the room what you need* (no needs), *Answer: <need>* per open need, *Mark at least
one criterion as must* / *No criteria yet*, *Rank: <criterion>* per open criterion, *Shortlist at least 2 products* /
*Shortlist one more product*, *n Compare cells still empty*. Recommend can be asked at any time (*Recommend now
(n missing)*); the answer appears in the reading panel and says what is missing and how sure it is. Once a product is
chosen, Recommend gives way to the status (*decided*, then *Mark as bought* → *bought*).

## Form (r002-01)

- Rail: 88 px wide, 18 px × 8 px padding, 22 px between items, no rules; hover tints the whole rail.
- Missing mark: a 5 px dot left of the numeral.
- Hover list: to the rail's left, 230 px wide, 12 px × 14 px padding.
- Sheet: 32 px × 40 px padding; header line, then the missing line (14 px above, 34 px below).
- Columns: two equal columns, 36 px either side of one vertical hairline.
- Needs: question above answer, 16 px apart; the answer field shows its underline only on hover and focus.
- Criteria: groups 22 px apart, rows 6 px apart.
- Shortlist: 40 px above, with a hairline; each product is a row with 14 px above and below, on a grid (name, fact, state, actions), over a faint rule.
- Narrow screens (≤ 760 px): the rail becomes a horizontal strip, the columns stack, the hover lists are hidden.

## Type (r003-01)

Families (the app's): `--font-text` Segoe UI Variable Text, `--font-display` Segoe UI Variable Display, `--font-small`
Segoe UI Variable Small, each falling back to `'Segoe UI', system-ui, sans-serif`. Sentence case everywhere, no extra
tracking. Scale `--step--1 … --step-6` = 11 / 12 / 13 / 15 / 18 / 24 / 30 / 38 px; leading 1.1 / 1.45 / 1.65.

| Element | Face | Weight | Size |
| --- | --- | --- | --- |
| Rail numeral | Display, tabular, −0.01em | 350 | 30 px (denominator 15 px) |
| Rail labels, status, missing count | Small | 400 (title *Board* and Recommend 600) | 11 px |
| Sheet title | Display | 350 | 24 px |
| Missing line | Text | 400 (lead-in 600) | 13 px / 1.65 |
| Section labels (Needs, Criteria, Shortlist…) | Small | 600 | 11 px |
| Need question / answer | Small 400 12 px / Text 400 15 px | | |
| Criteria group name | Text | 600 | 15 px |
| Criterion / why | Text 13 px / Small 11 px | | |
| Product name | Display | 600 (candidate 350) | 18 px |
| Product fact, rejected list | Text | 400 | 12 px |
| Toggles and small buttons | Small | 400 | 11 px |

## Colour (r004-03, Choose palette tokens only)

| Element | Token |
| --- | --- |
| Rail and sheet surface | glass: `--surface` 55% + blur 20 px, `--glass-line` hairline |
| Rail spine (graph side) | 2 px `--accent`; when the board is open, a 2 px `--accent` top edge instead |
| Rail title *Board* | `--accent` |
| Settled counter numeral | `--accent` (denominator `--ink-faint`) |
| Counter with something missing | numeral `--ink`, dot `--focus` |
| Recommend (not ready) | 1 px `--accent` outline, `--accent` text |
| Recommend (ready, rail and sheet) | `--accent` fill, `--accent-ink` text, halo `0 0 24px 6px --glow-far` |
| Status chip | exploring: `--accent` outline and text; ready: + `--accent` at 18% fill; decided: `--surface-2` fill, `--focus` outline and text; bought: `--accent` fill, `--accent-ink` text |
| Section labels | `--accent` |
| Missing line | text `--ink`, lead-in `--focus`, each item underlined in `--focus` |
| Open need's question and marker | `--focus` |
| *Must* group name | `--accent`; other group names `--ink` |
| must·nice·irr. toggle | 1 px `--accent` outline; selected `--accent` fill, `--accent-ink` text |
| Chosen product | `--accent` card (10 px radius), `--accent-ink` text, its buttons inverted (`--accent-ink` fill, `--accent` text; *Mark as bought* `--bg` fill, `--focus` text) |
| Column divider, shortlist rule | `--accent` at 30% |
| Hover list | `--surface`, `--line` border, shadow from `--code` |

Contrast is that of the accepted palette (accent-ink on accent 8.18, accent on glass 8.26, focus on bg 13.94).

## Motion (r005-02)

Easing: out `cubic-bezier(.2,.7,.2,1)`, in `cubic-bezier(.5,0,.8,.4)`. Event-driven only; nothing loops.

| Event | Motion |
| --- | --- |
| Open the board | reveal from the rail's edge leftward, `clip-path inset(0 0 0 100%) → 0`, 320 ms out; sections (header, missing line, the two columns, shortlist) slide 16 px from the right and fade in, 220 ms, starting at 120 ms, 40 ms apart |
| Close | the reverse reveal, 240 ms in; the graph returns after it (at most 450 ms, so a hidden window still closes) |
| A counter's value changes | roll: the old value slides up 60% and fades, the new one rises from 60% below, 280 ms out. Changes made inside the open board roll on the rail when it closes |
| The board becomes complete | a 2 px `--focus` light (with a `--glow-near` blur) runs up the spine from the bottom, 600 ms (scaleY 0 → 1 by 75%, then fades); Recommend then fills from the left, `clip-path` 360 ms, starting 420 ms in (in the open sheet, no run and no delay) |
| Status changes | the chip slides 8 px from the left and fades in, 220 ms |
| A product is chosen | its teal card fills from the left, `clip-path` 360 ms |

Reduced motion (OS setting or Appearance → Always reduce, GV-100): every change is instant, no hook runs (GV-101).
Nothing is conveyed only by motion: every animated state is in the static render (GV-103).

## For the implementation

- **Specs, on acceptance:** [choose-room](../../agent_wiki/specs/choose-room.md) CR-14 records the rail, the board in place of the graph and the
  completeness rule (resolves "what counts as complete" of CR-61); CR-50/51 note that the board counts empty Compare
  cells for must criteria. RS-33 is respected (event-driven motion inside a room's space, like the graph's).
- **State rules** already written for the prototype (`board-kit-color.js`): counts, missing list, completeness, choosing
  one product un-chooses any other (CR-22), un-choosing returns to *exploring*, *Mark as bought* only on the chosen one
  (CR-24).
- **Not designed here:** the Compare table (its own design next), the recommendation's text in the panel (B2 prompts),
  Choose's node glyphs (design 4). The prototype's *Fill Compare* stands for "the room fills the empty cells" (CR-51).
