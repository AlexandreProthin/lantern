---
type: Spec
title: Choose room
description: The second room - from knowing nothing about a kind of product to a reasoned choice - its spaces, node kinds and states, decision board, needs, research with sources, and accent.
tags: [rooms, choose, buying, decision]
status: draft
generated: { by: claude-code/opus-5.5, at: 2026-10-12T22:00:00Z }
---

Source: spec workshop rounds 5 and 6 (2026-10-12). Every rule below was chosen by the user in those
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
- **CR-12** Welcome and Gallery are the room's own ([spaces-per-room-no-home](/decisions/spaces-per-room-no-home.md)):
  Welcome starts a new choice (*What do you want to choose?*) or continues one of the 3 most recent
  Choose subjects; Gallery lists the Choose subjects with their status (CR-24).
- **CR-13** Welcome MUST offer an optional direction field for what the user already knows, like
  Learn's (WG-9): *budget about 500 €, I want to print figurines for my kids* (q-buy-needs).

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

# States

- **CR-21** States per kind (q-buy-states):

| Kind | States |
|---|---|
| `concept`, `family` | `open` → `lit` (explained), as in Learn; no *understood* |
| `need` | `open` → `answered` (the user's answer is stored and shown on the board) |
| `criterion` | `open` → `must` / `nice` / `irrelevant` (sets the ranking on the board) |
| `product` | `candidate` → `shortlisted` → `chosen`, or `rejected` with a reason |
| any | `dismissed`, from `open` only, restorable, never re-proposed (as LR-54) |

- **CR-22** At most one product is `chosen` per subject. Choosing one MUST NOT reject the others
  automatically.
- **CR-23** A criterion's state can be changed at any time; a need's answer can be edited at any
  time (CR-31).
- **CR-24** The **subject** has a status: `exploring` → `decided` → `bought`, shown in the Gallery.
  Choosing a product makes the subject `decided`; un-choosing it returns to `exploring`. `bought`
  is the user's action *Mark as bought* on the chosen product. A choice that is not a purchase
  simply stays `decided` (q-r6-status).
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
  `--allowedTools` in safe mode. The spike runs **during the frame release** (q-r6-web-spike): a few
  real calls on the user's subscription to measure latency and token use, see how web use is
  reported, and check that no other tool can run. Its results go into a decision before any Choose
  code.
- **CR-45** Web searches MAY be delegated to a cheaper model (for example Haiku 5.5): a Choose room
  setting, default *same model as the subject* (q-r6-web-spike note; relates to the backlog entry
  *Cheaper model for cheap tasks*). The generation log records the model each call used (DM-30).

# Compare

- **CR-50** Compare shows the shortlisted products as columns and the criteria as rows, `must`
  first, then `nice`; `irrelevant` criteria are hidden behind a toggle. Each cell holds a value with
  its source (CR-41).
- **CR-51** The room fills a product's column when it is shortlisted, and a criterion's row for the
  shortlisted products when the criterion is added. The user can edit any cell: an edited cell is
  marked as the user's and keeps the room's value, as edits do in Learn (DM-16) (q-r6-compare).

# Recommendation

- **CR-60** The recommendation names one product, why it fits the user's needs and must-criteria,
  and what the user gives up compared with the other shortlisted ones.
- **CR-61** It can be asked for **at any time**: it then says what is still missing and how sure it is.
  When the board looks complete, the room **offers** it (q-r6-recommend). What counts as complete
  is a design detail of the board.

# Look

- **CR-70** The Choose lantern is **teal** (q-buy-accent): its own palette under
  `data-room="choose"` (RS-30, RS-31), designed in `agent_design` before it is implemented. The user
  likes copper / rose gold too, likely for a future room.

# Shared behaviour

- **CR-80** As in Learn: one generation at a time per subject (LR-40), atomic results (LR-1),
  streaming not stored until `ok` (LR-2), every call logged (LR-3), cancel (LR-36), edits that take
  precedence (LR-35), text links between nodes (DM-21), model and effort per subject.
- **CR-81** Tone: the same presets as Learn (ELI5, Curious, Student, Engineer, Expert, or custom
  text), the same component, per subject, with a room default (q-r6-tone).

# Settings

- **CR-90** Settings → **Choose room** (SE-12 amended), keys under `choose.*` (q-r6-settings):
  country, for shops and prices (default: Windows' region); currency (default: the country's);
  default tone; *Use the web* (default on, CR-44); the model for web searches (default: same as the
  subject, CR-45). Model and effort defaults stay in Provider, shared by rooms.

# Open

- The web-tools decision, after the spike (CR-43).
- The board's and the teal palette's look: `agent_design` rounds (CR-10, CR-70).
- Which Choose fields go in `data` under `lantern/2` ([decision](/decisions/format-lantern-2.md)), with the v0.2.0 plan.

Related: [rooms-spaces](/specs/rooms-spaces.md), [domain-model](/specs/domain-model.md),
[learn-room](/specs/learn-room.md), [inference-provider](/specs/inference-provider.md),
[settings](/specs/settings.md), [product-scope](/specs/product-scope.md).
