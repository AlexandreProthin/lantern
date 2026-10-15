# Choose Compare — final design

Selected on 2026-10-15 by explicit user instruction in chat: "r006-03 is the one to lock for final". The last saved
request (revision 7) picks the same line: r001-01, r001-03, r002-01, r003-01, r004-01, r005-01, r006-03.

- Winner: **r006-03 — Rows stay open, clean lines** (motion), on r005-01 (motion), r004-01 (colour), r003-01 (form),
  r002-01 (structure, from r001-01 and r001-03), with the board's accepted type (choose-board r003-01).
- Final snapshot: [choose-compare-fin-r006-03.html](final/choose-compare-fin-r006-03.html), a byte-exact copy of
  [choose-compare-mot-r006-03.html](motion/choose-compare-mot-r006-03.html). Its experiment header stays as provenance.
- Shared files, loaded as `../…` (same from `final/` as from `motion/`): [choose-compare-data.js](choose-compare-data.js)
  (six scenarios), [assets/compare-kit-color.js](assets/compare-kit-color.js) (state changes and the frame in the room
  tokens), [assets/compare-structure.js](assets/compare-structure.js) (the table's markup and click rules, frozen in
  round 3), [assets/compare-motion-2.js](assets/compare-motion-2.js) and [assets/compare-resize-3.js](assets/compare-resize-3.js)
  (motion), [assets/backdrop.js](assets/backdrop.js). Prototype controls, not part of the design: the scenario pill
  (bottom left), *Finish (prototype)* in the research line, *Reduce motion*, the corner tag. The research texts and
  "Filled by research" values are stand-ins.

## What it is

Compare is a full-width table: shortlisted products as columns, criteria as rows grouped **Must**, **Nice to have**
and, behind *Show irrelevant (n)*, **Irrelevant** (CR-50).

- **Cells show everything inline** (from r001-01): the value; under it each source as a kind tag (*manufacturer*,
  *measured*, *opinion*, *model knowledge*; *sponsored* struck through with "not used") with its name and the date read
  (CR-41, CR-42); a note when sources disagree (≠) or none was found (?); a price as "an indication, not a promise · seen
  <date>"; the user's own value as a *yours* tag with the room's value beside it, struck (CR-51).
- **The criterion column** (first column, sticky) shows the criterion, why it matters, and a summary of how well it is
  known (from r001-03), e.g. "1 manufacturer · 2 measured · 2 opinion · ≠ 1 · ? 1".
- **Evidence cards** (r001-03's band, with the round 3 click rules):
  - a click on a criterion unfolds that row's band, one evidence card per product; again folds it. A click on the
    column header ("n shortlisted") unfolds or folds every row;
  - a click on a product cell unfolds only that cell's card under it; again (or ✕ / Esc) folds it;
  - a click on a cell folds any unfolded rows first; if the cell is in an unfolded row, only its card stays open;
  - a card lists every source with its value, kind, name and date read, the disagreement note, the room's value beside
    the user's, the price caution, an edit field, *Save as mine*, *Revert to the room's* and *Check this*; a full band
    adds *Check this row*. Cells are not edited in place.
- **Product headers**: name, *Choose* / *Remove*; the chosen one reads *Chosen* with *Un-choose*. Choosing un-chooses
  any other (CR-22) and makes the subject *decided* (CR-24).
- **Research** (40–65 s): a line in the toolbar shows the current step from the stream's tool events and *Cancel*;
  cells being filled are striped and read *Researching…*; a new product's column or a new criterion's row fills as
  research arrives (CR-51).
- **Web off** (CR-44): a banner says values come from the model's knowledge with its date, with *Turn the web on*; the
  cells' source is *model knowledge*; *Check this* is hidden.
- **One product**: a dashed cell invites shortlisting more and names the board's candidates.

Open from round 3: with a single card open, clicking another criterion opens that row and leaves the card open. The
user was asked whether the row click should fold the card; not answered, so it stays as built.

## Decisions and ancestry

| Round | Designs | Picked | Decision |
| --- | --- | --- | --- |
| 1 wireframe | r001-01 Sourced cells, r001-02 Evidence drawer, r001-03 Row evidence | r001-01 + r001-03 | Inline sources, plus row evidence. |
| 2 wireframe | r002-01 Sourced cells + evidence band, r002-02 Lean cells, r002-03 Rows that open in place | r002-01 | Full inline cells, band under the row from the first column. |
| 3 form | r003-01 Dense ledger, r003-02 Quiet, r003-03 Tonal tiles | r003-01 | Plus the user's click rules (structure amendment agreed in chat before the round). |
| 4 colour | r004-01 Teal spine, as the board; r004-02 Trust in colour; r004-03 Quiet ink | r004-01 | Type skipped by the user: the board's type is applied. |
| 5 motion | r005-01 Quiet fades, r005-02 Unfold, as the board, r005-03 Research light | r005-01 | |
| 6 motion | r006-01 Quiet fades, smooth resizing; r006-02 and r006-03 added by amendment | **r006-03** | r006-01 one proposal at the user's request; r006-02 keeps unfolded rows open and fades highlights; r006-03 removes the teal lines on empty cells. |

## Verbatim inputs

| Round | Saved prompt (picks · phase · mode) |
| --- | --- |
| 1 | Compare space (CR-11, CR-50, CR-51): a full-width table, shortlisted products as columns and criteria as rows, must first, then nice; irrelevant criteria hidden behind a toggle. Each cell holds a value with its source and the date it was read (CR-41), and follows the source rules (CR-42: manufacturer specs, independent measurements preferred, community reports marked as opinion, affiliate lists never a basis, sponsored sources marked, disagreements shown). The room fills a product's column when it is shortlisted and a criterion's row when it is added; the user can edit any cell, and an edited cell is marked as the user's and keeps the room's value. Hard cases: one product, five products, a cell being filled (research takes 40-65 s), a cell with no source found, sources that disagree, a user-edited cell, a long value, a price (an indication at a date), a chosen product, web use turned off (values from the model's knowledge with its date, CR-44). (none · wireframe · combine; written by the agent, saved unchanged by the user) |
| 2 | r001-01 with the added ability of unfolding the evidence banner from r001-03 if clicking on the very left column (shortlisted column) (r001-01, r001-03 · wireframe · combine) |
| 3 | r002-01 but selecting a cell other than one from the first column only unfold its corresponding card. if the entire row is unfolded from a clic from the first column then clicking a cell from the compared choices fold the row if not in it and open the item else just keep this item deployed (… r002-01 · form · combine) |
| 4 | We skip Type round, just take the same as the one we already selected from the choose-board design. next step color (… r003-01 · color · combine) |
| 5 | (empty) (… r004-01 · motion · combine) |
| 6 | next round is only one proposal. make the columns and row resize smoothly when the selection changes. (… r005-01 · motion · combine) |
| 6, amended | "r006-01 need to be adjusted: do not fold to unfold right after if the row is already unfolded, keep it unfolded; on the fold/unfold do not make unhighlighted lines sudently highlighted. fix it by making r006-02 (second proposition of round 6, r006-01 untouched)" |
| 6, amended | "almost there do r006-03 by fixing the line highlight on fold/unfold i screen it during the animation and circled what i mean" (with a screenshot) |

How they were read: round 2's "very left column (shortlisted column)" = the criterion column, whose header reads
"n shortlisted". Round 3: the click rules are structure; the user chose in chat to fold them into the form round, and
"keep this item deployed" = only the clicked card stays open. Colour: the palette is the accepted Choose palette; the
round varied its use. Round 6 "only one proposal": the workflow tool gained `"single": true` and an `amend` command at
the user's request.

## Form (r003-01, dense ledger)

- Grid: hairlines on every cell (`border-spacing: 0`). Header row and group bars are grey bars, 6 px × 8 px padding.
  Product columns are at least 170 px; the criterion column is 190 px, sticky.
- Cells: 6 px × 8 px padding, at most 260 px wide. Each source is one line, shortened with an ellipsis (names at most 150 px).
  Notes have a 2 px left rule and 5 px padding.
- Bands and cards: a flush, slightly lighter band row (6 px × 8 px, 10 px at the bottom). A single card is tied to its
  cell by a 2 px rule on the card's cell and a 2 px underline on the open cell.
- Sources in a card are compact rows of 3 px; the edit field and buttons have 3 px gaps.
- Five products fit a laptop width; more scroll sideways with the criterion column pinned.

## Type (choose-board r003-01, on the ledger's scale)

Segoe UI Variable Text / Display / Small (fallbacks `'Segoe UI', system-ui, sans-serif`), sentence case, no extra
tracking; scale 11 / 12 / 13 / 15 / 18 / 24 / 30 px.

| Element | Face | Weight | Size |
| --- | --- | --- | --- |
| Toolbar title *Compare* | Display | 350 | 24 px |
| Product name | Display | 600 | 15 px |
| Corner count, group labels | Small | 600 | 11 px |
| Criterion name | Text | 600 | 13 px |
| Why, summary, source lines, price and room notes | Small | 400 | 11 px |
| Cell value | Text | 600 (none / researching 400 italic) | 13 px |
| Kind tags | Small | 600 | 11 px |
| Card source value / meta | Text 400 12 px / Small 400 11 px | | |
| Buttons in headers, cards, bands | Small | 400 | 11 px |

The ledger's earlier uppercase labels and 9–10 px text became sentence case at 11 px.

## Colour (r004-01, Choose palette tokens only)

| Element | Token |
| --- | --- |
| Table surface | glass: `--surface` 55% + blur 20 px; hairlines `--glass-line` |
| Header row, group bars, criterion column | `--surface` at 92% / 92% / 88% over the glass; header bottom rule `--line` |
| Group labels, the criterion's ▸ / ▾ | `--accent` |
| Criterion with its band open | 2 px `--accent` left edge |
| Chosen product | header filled `--accent`, text `--accent-ink`, its buttons inverted; its cells framed by 2 px `--accent` rules |
| ≠ and ? marks, note rules | `--focus` |
| *yours* tag | `--focus` fill, `--accent-ink` text |
| Kind tags | `--line` outline, `--ink-mute` text; *measured* `--ink-mute` outline and `--ink` text; *opinion* dashed italic; *model knowledge* dotted; *sponsored* struck, `--ink-faint` |
| Open cell | 2 px `--accent` underline, band tint (`--surface-2` 60%) |
| Band | band tint; bottom rule `--accent`; a single card's cell has a 2 px `--accent` left rule |
| *Choose* buttons, *Check this row* | `--accent` outline and text |
| Being filled | stripes of `--accent` at 10% |
| Research line | 1 px `--accent` outline, spinner `--accent` |
| Web-off banner | `--surface-2` 70% |
| Hover on a row | `--ink` 4% (criterion cell `--surface-2` 92%) |

## Motion (r005-01 + round 6)

Easing for resizing `cubic-bezier(.3,.6,.3,1)`, 240 ms (`RESIZE.ms`). Event-driven only.

| Event | Motion |
| --- | --- |
| A band or a single card opens | the row grows from zero height: each cell's content is clipped and eased from 0 to its height (240 ms) while its padding grows; the band's `--accent` rules, the card cell's rule and the criterion's teal edge fade in with it |
| It folds | the reverse in 204 ms, rules fading out; the table redraws when it ends (at most 400 ms) |
| The selection changes inside an unfolded row (row → card, card → card, card → row) | the band stays open: cards that go fade out (140 ms), the band eases from its old height to its new one, new cards fade in (240 ms); the open cell's underline fades out and in |
| Any change of selection | every column eases from its old width to its new one (240 ms); rows re-wrap with it |
| Irrelevant criteria shown / hidden | their rows grow in / shrink away (hiding waits for the shrink) |
| A value arrives, is edited or reverted | the cell cross-fades (opacity .25 → 1, 200 ms) |
| A product is chosen | its header and cells fade up (opacity .45 → 1, 200 ms) |
| While anything resizes | hover highlights are suspended until the pointer moves again |

Empty cells of a band are never wrapped for the animation, so they never pick up the open card's rule (the r006-03 fix).
Reduced motion (OS or Appearance → Always reduce, GV-100): every change instant, no hook runs; the research spinner
becomes a static dashed ring (GV-101). Nothing is conveyed only by motion (GV-103).

## For the implementation

- **Specs, on acceptance:** [choose-room](../../agent_wiki/specs/choose-room.md) CR-50/CR-51 record the layout, the
  inline sources, the evidence cards and their click rules, editing in the card, research in progress and web off.
- The source kinds (manufacturer, measured, opinion, sponsored, model knowledge) and a cell's status (ok, filling, none,
  disagree, edited) are the data B2 must store for each Compare cell (with the room's value kept beside the user's,
  DM-16), and the prompts must produce (CR-42).
- The table's re-render is the prototype's; in Svelte, keyed rows make the clipping wrappers and the "remember the
  widths" step simpler (a measured FLIP on the columns, height transitions on the band rows).
