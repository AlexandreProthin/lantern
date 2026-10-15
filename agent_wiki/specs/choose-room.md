---
type: Spec
title: Choose room
description: The second room - from knowing nothing about a kind of product to a reasoned choice - its spaces, node kinds and states, decision board, needs, research with sources, and accent.
tags: [rooms, choose, buying, decision]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-12T22:00:00Z }
verified: { by: "human:alex", at: 2026-10-15T17:00:00Z }
---

Source: spec workshop rounds 5 to 7 (2026-10-12 to 15), agreed by the user 2026-10-15. Every rule below was chosen by the user in those
rounds; the remaining questions are under [Open](#open).

The Choose room helps the user choose, and usually buy, something they know nothing about yet.
The reference session: *I want to buy a 3D printer and know nothing about them.* It ends with a
reasoned choice the user trusts. The frame it lives in is [rooms-spaces](/specs/rooms-spaces.md);
its data shape follows [domain-model](/specs/domain-model.md) (room-defined node kinds and states,
DM-4).

# Purpose

- **CR-1** A Choose session MUST be able to take the user to all of: enough understanding of the
  field to choose; a clear list of their needs and constraints; the criteria that matter, ranked
  for them; a shortlist of real products; a side-by-side comparison; and a recommendation with its
  reasons and what is given up (q-buy-goal).
- **CR-2** The room MUST favour objective facts over opinion and MUST NOT rely on sponsored
  content: the user trusts *objective facts, not sponsored* (q-buy-story). Source rules: CR-40.
- **CR-3** Teaching is **just enough to decide**: every explanation is aimed at the choice and says
  why it matters for it. There are no understanding checks (q-buy-learn-depth). An *Open in Learn*
  handoff is Later, with subjects living in several rooms (q-r5-cross-room); confirmed Later in round 6 (q-r6-learn-handoff).
- **CR-4** What happens after the choice (setup, first steps, consumables) is out of scope for now.

# Shape and spaces

- **CR-10** A session is **a free graph plus a decision board** (q-buy-shape): the user explores the
  graph in any order, as in Learn, and the board collects what has been settled (needs, ranked
  criteria, shortlist, the pick) and shows what is still missing before a decision. The board's
  look is a design task in `agent_design`, as Welcome's was (PS-28).
- **CR-11** The room's spaces, in order (q-buy-spaces): **Welcome**, **Survey** (graph and
  reading panel, as Study; q-r6-space-name), **Compare** (a full-width table of the shortlist against the criteria)
  and **Gallery**. The default space for a subject is Survey.
- **CR-14** The decision board is a **slim strip next to the graph** in Survey, always visible, with a
  few counters and what is still missing; a click opens it full height. The reading panel stays for
  nodes (q-r6-board).
  *Designed 2026-10-14* (`agent_design/choose-board/RECIPE.md`, r005-02 *Unfold from the spine*, accepted by the
  user): a **counter rail** in place of the divider between graph and panel, showing needs answered/total, must
  criteria (with the nice count), shortlisted, the pick, the subject status, how many things are missing and
  *Recommend*; a mark on a counter means something is missing there, hovering lists what. A click opens the board
  **in place of the graph**, full height (Esc or *Back to graph* closes it): the missing items, the needs card and the
  criteria grouped must / nice / to rank / irrelevant side by side, then the shortlist and pick with *Choose*,
  *Reject*, *Un-choose* and *Mark as bought*. Its form, type, colours (teal spine) and motion (unfolds from the rail;
  counters roll; a light runs up the spine when the board becomes complete) are in the recipe; motion is event-driven
  only and instant under reduced motion.
- **CR-12** Welcome and Gallery are the room's own ([spaces-per-room-no-home](/decisions/spaces-per-room-no-home.md)):
  Welcome starts a new choice (*What do you want to choose?*) or continues one of the 3 most recent
  Choose subjects; Gallery lists the Choose subjects with their status (CR-24).
  *Gallery designed 2026-10-15* (`agent_design/choose-gallery/RECIPE.md`, r004-02 *Unfold from the band*, accepted by
  the user): Learn's Gallery mechanism (WG-51 to WG-71) told in status. A toolbar with **status tabs** *All · Exploring ·
  Decided · Bought* and their counts, the name filter, sort (*Last opened*, *Created*, *Status*, *Closest to a
  decision*, *Name*) and the count. Equal cards, each with: a **status band** (status, last opened); the title on one
  line; a **steps bar** (needs answered, criteria ranked, shortlist, pick) in place of the graph thumbnail; the **pick
  line** as the largest text (the chosen or bought product with its price, or *n missing* by the board's completeness
  rule, or *Ready*, or the un-chosen product struck through); and the CR-25 stats. Selecting **lifts the card over the
  grid at card width**: the pick with its source and date (CR-41), *Open in Survey*, *Rename*, *Reveal*, *Delete…*, the
  status **history** as a vertical timeline, the board's numbers, the direction and the subject's figures. Rename,
  delete (Learn's dialog with Choose numbers), keyboard and empty state follow WG-61 to WG-71. Form, type (choose-board's),
  colours (the band speaks the board's status chip: exploring teal outline, decided `--surface-2` with `--focus`, bought
  solid `--accent`) and motion (choose-board's language: the lifted card unfolds from its band, cards glide on sort and
  filter, a status change fills the band, tab counts roll; event-driven, timer-finished, instant under reduced motion)
  are in the recipe.
  *Welcome designed 2026-10-15* (`agent_design/choose-welcome/RECIPE.md`, r003-01 *Learn's embers, teal*, accepted by
  the user): Learn's Welcome (WG-1 to WG-14) for choosing, in the same layout, type and motion. The question field
  becomes Learn's capsule; tone and model pickers as Learn's; a **locale line** under them (*Prices for France in € ·
  research on the web · change*, or *web off, from the model's knowledge*, CR-44, CR-90) opening Settings → Choose
  room; **Continue a choice**: the 3 most recent Choose subjects as **Gallery's resting card** (status band, title,
  steps bar, pick line, CR-25 stats) with a *Continue* link, dimmed until hovered as Learn's shelf; *Browse all n*.
  **No *Suggest 3 subjects*** in this room. First run, CLI not ready and library unavailable follow WG-12 to WG-14 with
  Choose wording; the header shows the four spaces (CR-11). Colours are where Learn's light falls, in teal (CR-70);
  motion is Learn's shipped embers and capsule, plus the starters appearing like Learn's chips and a light along a
  card's steps bar on hover.
- **CR-13** Welcome MUST offer an optional direction field for what the user already knows, like
  Learn's (WG-9): *budget about 500 €, I want to print figurines for my kids* (q-buy-needs).
  *Designed 2026-10-15* (choose-welcome recipe): the direction is called **the needs** and opens with **Shift+Enter**
  inside the capsule, exactly as WG-9/WG-10 (keys, 500-character limit, counter, messages), placeholder *Budget, who
  it's for, what you already know… (optional)*. Under it, **need starters** *Budget (€)*, *Who it's for*, *What for*,
  *Where it goes*, *Already have*, *Must avoid*: a click inserts only the starter's label at the cursor (*budget about
  … €*, *it's for …*), never an answer, so the app still never writes the user's needs (WG-11); the currency comes
  from CR-90. The example line ends with *Shift+Enter adds your budget and needs.* The needs feed the needs card
  (CR-30, CR-31).
  *Round 7 (q-r7-needs-note):* the text stays the user's note at the top of the needs card (*In your words*),
  editable any time and sent with every call; the room never splits or rewrites it, and proposes need nodes only
  for what it does not cover ([choose-protocol](/specs/choose-protocol.md) CP-2).

# Node kinds

- **CR-20** Kinds (q-buy-nodes), each with its own glyph and legend row:

| Kind | What it is | Example |
|---|---|---|
| `subject` | The root: what is being chosen | *3D printer* |
| `concept` | Something to understand to choose well; a trade-off is a concept | *What is a heated bed?*, *Speed vs. print quality* |
| `need` | A question to the user, answered by them; feeds the criteria | *What will you print?*, *How much can you spend?* |
| `criterion` | Something to compare on, with why it matters for this user | *Build volume*, *Noise* |
| `family` | A group of similar products | *Enclosed CoreXY around 600 €* |
| `product` | A real model, with key facts and sources | a named printer |
| `own` | Added by the user, as in Learn | |

  *Designed 2026-10-15* (`agent_design/choose-nodes/RECIPE.md`, r003-02 *Fill and turn* on r001-01 *Kind inside, state
  around*, accepted by the user): every kind keeps Learn's 44 px disc (the subject 54 px) and the **pictogram inside
  names the kind**: subject a target, concept an *i*, need a question mark, criterion a balance, family three clustered
  circles, product a box, own a pen. The legend has one row per kind (its pictogram) followed by the state rows (CR-21).

# States

- **CR-21** States per kind (q-buy-states):

| Kind | States |
|---|---|
| `concept`, `family` | `open` → `lit` (explained), as in Learn; no *understood* |
| `need` | `open` → `answered` (the user's answer is stored and shown on the board) |
| `criterion` | `open` → `must` / `nice` / `irrelevant` (sets the ranking on the board) |
| `product` | `candidate` → `shortlisted` → `chosen`, or `rejected` with a reason |
| any | `dismissed`, from `open` only, restorable, never re-proposed (as LR-54) |

  *(B4, agreed by the user 2026-10-15.)* A product is never dismissed: it is rejected with a reason or removed from the shortlist. *Remove* takes a shortlisted product back to `candidate`; a rejected product can be restored to `candidate`, losing its reason. A ranked criterion never returns to *to rank*, and an answered need never returns to open: its answer is edited (CR-23).

  *Designed 2026-10-15* (`agent_design/choose-nodes/RECIPE.md`, r003-02): the state reads **around** the pictogram.
  The ring gives one of Learn's looks, in Choose's tokens: `open` / `candidate` dotted; `lit` glowing; `answered`,
  `must`, `nice`, `shortlisted`, `chosen` settled (filled `--node-understood`, as Learn's understood); `irrelevant` a
  quiet grey ring with a muted title; `rejected` and `dismissed` faded (dismissed also struck through). A **20 px badge
  on the rim** gives the exact state: check answered, `!` must, `+` nice, `–` irrelevant, bookmark shortlisted, star
  chosen (plus a second `--focus` ring and the lit glow), × rejected. The subject shows its status (CR-24) the same
  way: ellipsis exploring, check decided, bag bought (filled). A rejected product's reason is in its tooltip,
  accessible name and the panel, not on the graph. No red on nodes. Motion, on state changes only: rising states fill
  from the centre (360 ms) and the badge comes out onto the rim; falling ones close into the centre (300 ms); a
  badge-only change turns the badge over; a pick opens its second ring and its glow blooms. Instant under reduced
  motion (GV-100). Dismissed opacity follows GV (at most 35 %), not the design's 45 % (the user, 2026-10-15).

- **CR-22** At most one product is `chosen` per subject. Choosing one MUST NOT reject the others
  automatically. *(B4, agreed by the user 2026-10-15.)* Choosing another product first un-chooses the current one, which goes back to
  `shortlisted`; the history records both changes.
- **CR-23** A criterion's state can be changed at any time; a need's answer can be edited at any
  time (CR-31).
- **CR-24** The **subject** has a status: `exploring` → `decided` → `bought`, shown in the Gallery.
  Choosing a product makes the subject `decided`; un-choosing it returns to `exploring`. `bought`
  is the user's action *Mark as bought* on the chosen product. A choice that is not a purchase
  simply stays `decided` (q-r6-status).
  *Gallery, decided 2026-10-15 with its design:* the subject keeps its **status history** (each change with its time
  and product, un-choosing included), shown as the timeline of a selected Gallery card. An un-chosen subject is
  `exploring` again, and its card shows the un-chosen product struck through with when (*un-chosen 6 h ago*) until a
  product is chosen again; the product itself is back to `shortlisted`. The Gallery's status, pick, counts and
  history come from the summary cache (WG-35), never from the full subject file.
- **CR-25** Header compact stats read like *4 needs · 6 criteria · 3 shortlisted* (RS-12 item 5,
  through `statsSummary`).

# Needs

- **CR-30** The room learns the user's needs from four places (q-buy-needs): the Welcome direction
  (CR-13); **need nodes** proposed when they become meaningful (*an enclosure matters if you print
  ABS; will you?*); the **dialogue**, where the tutor proposes recording a need the user mentioned
  and the user confirms; and the **needs card** on the board.
- **CR-31** The needs card MUST be editable at any time; it is the single list of the user's needs
  and constraints that every later generation receives.
- **CR-32** There MUST NOT be a questionnaire up front: the user does not know enough yet to answer it.

# Research and sources

- **CR-40** Product facts go stale and the model's knowledge stops at its training date, so the room
  MAY use **web search and page fetching** (q-buy-web, option b), with no other tool and no file
  access. Tasks that may search (q-r6-web-tasks): finding products and families, product facts
  (specs, known issues, firmware, ecosystem), a price idea (a range at a date, with where it was
  seen), alternatives to a product, filling Compare cells, and a **Check this** action that
  fact-checks a node or a reply on request. Explaining concepts stays offline unless the user asks
  for a check.
- **CR-44** Web use can be turned off for the room (CR-90); the room then works from the model's
  knowledge, with each product fact marked with the model's knowledge date.
- **CR-41** Every product fact (spec, price, availability) MUST show its source and the date it was
  read. A price is an indication at that date, never a promise.
- **CR-42** Source rules (q-r6-sources), for the tutor and for what the app shows:
  1. Manufacturer specifications are the source for specs.
  2. Independent measurements and reviews are preferred for performance and quality.
  3. User communities (forums, Reddit…) count as experience reports, marked as opinion.
  4. Affiliate "best of" lists and sponsored rankings are never the basis of a recommendation.
  5. A source known to be sponsored or affiliate is marked as such.
  6. Every product fact shows its source and the date it was read (CR-41).
  7. When sources disagree, the room says so instead of picking one silently.
- **CR-43** This changes the provider's no-tools rule (IP-20, IP-60,
  [claude-cli-provider-flags](/decisions/claude-cli-provider-flags.md)) for this room only. It needs
  its own decision and a spike first: the CLI 2.1.290 accepts `--tools "WebSearch,WebFetch"` with
  `--allowedTools` in safe mode. **Done 2026-10-13**: [choose-web-tools](/decisions/choose-web-tools.md).
  Only WebSearch and WebFetch can run; a research call takes 40–65 s and about ten times a plain
  call's cost; the wait shows progress from the stream's tool events (IP-20).
- **CR-45** ~~Web searches MAY be delegated to a cheaper model.~~ Withdrawn 2026-10-13 by the user: in
  the spike Haiku was slower, not cheaper, and broke the source rules
  ([decision](/decisions/choose-web-tools.md)). Research calls use the subject's model.

# Compare

- **CR-50** Compare shows the shortlisted products as columns and the criteria as rows, `must`
  first, then `nice`; `irrelevant` criteria are hidden behind a toggle. Each cell holds a value with
  its source (CR-41).
- **CR-51** The room fills a product's column when it is shortlisted, and a criterion's row for the
  shortlisted products when the criterion is added. The user can edit any cell: an edited cell is
  marked as the user's and keeps the room's value, as edits do in Learn (DM-16) (q-r6-compare).
  *Designed 2026-10-15* (`agent_design/choose-compare/RECIPE.md`, r006-03 *Rows stay open, clean lines*, accepted by
  the user): a full-width **ledger**, products as columns and criteria as rows grouped *Must*, *Nice to have* and,
  behind *Show irrelevant (n)*, *Irrelevant*; the criterion column is sticky and shows why it matters and how well it is
  known (*1 manufacturer · 2 measured · ≠ 1 · ? 1*). **Cells show everything inline**: the value, each source as a kind
  tag (*manufacturer*, *measured*, *opinion*, *model knowledge*; *sponsored* struck, "not used") with its name and date
  read, a ≠ note when sources disagree, ? when none was found, a price as "an indication, not a promise · seen <date>",
  and a user's value tagged *yours* with the room's value beside it, struck. **Evidence cards**: a click on a criterion
  unfolds its row's band (one card per product), a click on the column header unfolds or folds every row, a click on a
  cell unfolds only that cell's card (inside an unfolded row, only that card stays open); with a single card open, a
  click on another criterion folds the card and opens only that row (the user, 2026-10-15). Cells are edited only in a
  card (*Save as mine*, *Revert to the room's*, *Check this*; a band adds *Check this row*). Product headers carry
  *Choose* / *Remove*, or *Chosen* with *Un-choose* (CR-22, CR-24). Research shows its current step and *Cancel* in the
  toolbar while the cells being filled are striped; web off shows a banner and hides *Check this* (CR-44); a single
  product invites shortlisting more. Form, type (choose-board's), colours (teal spine) and motion (rows grow and fold,
  columns ease to their new widths, event-driven, instant under reduced motion) are in the recipe. Each cell stores its
  sources with their kind and its status (ok, filling, none, disagree, edited), for B2.
  *Round 7 (q-r7-fill):* fills run in a **research lane**, one at a time per subject, alongside the user's own call,
  so they never block lighting, replies or Recommend ([choose-protocol](/specs/choose-protocol.md) CP-40, CP-41).

# Recommendation

- **CR-60** The recommendation names one product, why it fits the user's needs and must-criteria,
  and what the user gives up compared with the other shortlisted ones.
- **CR-61** It can be asked for **at any time**: it then says what is still missing and how sure it is.
  When the board looks complete, the room **offers** it (q-r6-recommend). What counts as complete
  is a design detail of the board.
  *Decided 2026-10-14 with the board design:* the board is **complete** when every need is answered; at least one
  criterion is `must` and none is still `open`; at least two products are shortlisted, or one is chosen; and no
  Compare cell is empty for the shortlisted products × `must` criteria. The answer appears in the reading panel.
  Once a product is chosen, the status replaces the offer.
  *(B4, agreed by the user 2026-10-15.)* A cell with *nothing found* (`null`) counts as filled, and dismissed needs and criteria do not count.

# Look

- **CR-70** The Choose lantern is **teal** (q-buy-accent): its own palette under
  `data-room="choose"` (RS-30, RS-31), designed in `agent_design` before it is implemented. The user
  likes copper / rose gold too, likely for a future room.
  *Designed 2026-10-14* (`agent_design/choose-palette/RECIPE.md`, r001-01 *Same night, teal lantern*, accepted
  by the user): Learn's house with a teal lamp. Values, binding: `--bg #101827`, `--surface #172132`,
  `--surface-2 #1f3034`, `--ink #f3e9dc`, `--ink-mute #aeb3bf`, `--line #3b4558`, `--accent #5cc6bd`,
  `--accent-ink #0d211f`, `--focus #b6efe6`, `--node-open #969ca7`, `--node-lit #c8f3ea`,
  `--node-understood #5cc6bd`, `--glow-near rgba(118,222,206,.32)`, `--glow-far rgba(84,204,188,.15)`,
  `--path-muted #3e625d`, `--code #0c1320`, `--error #d86a5a`, `--error-ink #f0a598`. The backdrop (RS-34)
  re-tints from these tokens with no change. Syntax colours: Learn's set, with `--code-keyword #5cc6bd`
  (proposed, to confirm when implemented).

# Shared behaviour

- **CR-80** As in Learn: one generation at a time per subject (LR-40), plus the Compare research lane (CP-41,
  round 7), atomic results (LR-1),
  streaming not stored until `ok` (LR-2), every call logged (LR-3), cancel (LR-36), edits that take
  precedence (LR-35), text links between nodes (DM-21), model and effort per subject.
- **CR-81** Tone: the same presets as Learn (ELI5, Curious, Student, Engineer, Expert, or custom
  text), the same component, per subject, with a room default (q-r6-tone).

# Settings

- **CR-90** Settings → **Choose room** (SE-12 amended), keys under `choose.*` (q-r6-settings):
  country, for shops and prices (default: Windows' region); currency (default: the country's);
  default tone; *Use the web* (default on, CR-44). Model and effort defaults stay in Provider, shared
  by rooms.
  *Round 7 (q-r7-locale):* a subject keeps the country and currency it was created with, changeable in its
  menu for future calls only, like tone.
  *(B4, agreed by the user 2026-10-15.)* With no region in the system language the country is FR; a country missing from the app's currency table
  gets EUR, which the user can change.

# Open

None that blocks code. Choose's `data` fields, prompts, context and evals are in
[choose-protocol](/specs/choose-protocol.md) (round 7, 2026-10-15).

Related: [rooms-spaces](/specs/rooms-spaces.md), [domain-model](/specs/domain-model.md),
[learn-room](/specs/learn-room.md), [inference-provider](/specs/inference-provider.md),
[settings](/specs/settings.md), [product-scope](/specs/product-scope.md).
