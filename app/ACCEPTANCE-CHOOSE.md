# Choose room acceptance (v0.2.0 plan, B5)

The user runs the reference session in an installed build: *I want to buy a 3D printer*, from
Welcome to a recommendation and *Mark as bought*, with real web results. Automated checks
(unit tests, Playwright with the fake provider, the `choose-1` evals) do not sign these off.
The contract is `../agent_wiki/specs/choose-room.md` and `choose-protocol.md`.

**Build:** v0.3.0 registers the Choose room (RS-4). Build and sign it as in `README.md`, install it over
v0.2.0 through the local update folder, then go through this list. Eval runs 2 and 3 come later (plan B5).

## Start

- [ ] Ctrl+Shift+2 (or the room chip) switches to Choose: teal lantern, the backdrop re-tints,
  Learn's subjects are not listed (CR-70, RS-30).
- [ ] Welcome: *What do you want to choose?*, Shift+Enter opens the needs; a starter inserts only its
  label; the locale line says *Prices for France in € · research on the web*; *change* opens
  Settings → Choose room (CR-12, CR-13, CR-90).
- [ ] Create *I want to buy a 3D printer* with a budget and who it's for. Survey opens, the intro
  streams, three children come, at least one a need (CP-10).

## Survey

- [ ] Each kind has its pictogram; states read around it (ring, rim badge); the legend matches
  (CR-20, CR-21). Nothing flashes on load; reduced motion makes changes instant.
- [ ] *Explain* a need or criterion: text only, the state does not change. Answer a need; rank
  criteria must / nice / irrelevant, and change a rank later (CR-23).
- [ ] *Find products* with the web on: *Searching… / Reading <host>…* while it runs, the first
  sentence before the search does not stay in the answer, Cancel works (IP-13, CP-32).
- [ ] Product facts: every one shows its source kind, name and the date read; the price says it is an
  indication at that date (CR-41).
- [ ] **Source rules on real results** (CR-42): specs from the maker; reviews or measurements for
  quality; forums marked opinion; no affiliate "best of" list behind a fact; sponsored sources struck;
  disagreeing sources said, not silently picked. Note any breach with the product and the source.
- [ ] A reply where you mention a need offers *Add to needs* in your words; *Add* records it (CP-30.4).
- [ ] The rail counts needs, must criteria, shortlist and pick; a mark shows what is missing; the board
  opens in place of the graph and closes with Esc; the needs card edits your note (CR-14, CR-31).

## Compare

- [ ] Shortlist two or three products, rank a criterion must: their cells fill in the research line
  while you keep working in Survey (CP-40, CP-41).
- [ ] Cells show value, sources and dates inline; ≠ where sources disagree; ? when nothing was found;
  the price row's caution (CR-50, CR-51).
- [ ] Evidence cards: the click rules (row, column, cell, single card). *Save as mine* keeps the room's
  value beside yours, struck; *Revert*; *Check this* refreshes the room's value, never yours (CP-13).

## Decision

- [ ] *Recommend* on an incomplete board says what is missing and how sure it is; on a complete board
  it names a shortlisted product, why it fits your needs and must criteria, and what you give up
  (CR-60, CR-61). The panel offers *Choose <product>*; nothing is chosen for you (CP-12).
- [ ] Choose, un-choose, choose again, *Mark as bought*: the subject's status follows, the graph shows
  the pick, the Gallery's history names each step (CR-22, CR-24).
- [ ] Turn *Use the web* off: *Check this* disappears, a find answers from the model's knowledge with
  sources marked *model knowledge* and prices called indications (CR-44, CP-11).

## Library and Learn

- [ ] Gallery: status tabs and counts, filter, the five sorts, the lifted card with the pick and where
  its price was seen, history, rename, reveal, delete to the Recycle Bin (CR-12, CR-24).
- [ ] Restart the app: the Choose subject, its board, Compare and status come back; the room you were
  in is the one that opens (RS-10).
- [ ] Learn looks and behaves as in v0.2.0: Welcome, Study, Gallery, a generation, the backdrop.

Record failures in the wiki (issues, or the plan's B5) and fix or explicitly defer them.
