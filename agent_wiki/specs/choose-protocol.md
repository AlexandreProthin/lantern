---
type: Spec
title: Choose protocol
description: What the Choose room stores and what its model receives and returns - the data fields under lantern/2, the choose-1 prompt set and tasks, the tagged blocks with sources, context assembly with the needs card and the board, and the evals.
tags: [choose, prompts, protocol, context, data, v0.2.0]
status: stable
generated: { by: claude-code/opus-5.5, at: 2026-10-15T20:00:00Z }
verified: { by: "human:alex", at: 2026-10-15T17:00:00Z }
---

Draft written 2026-10-15 for the [v0.2.0 plan](/plans/v0-2-0.md) step B2. The rules come from
[choose-room](/specs/choose-room.md) and its accepted designs; what the draft had to invent was settled by the
user in spec workshop round 7 (2026-10-15), marked *(round 7)*. It is the Choose counterpart of
[tutor-protocol](/specs/tutor-protocol.md) and [context-assembly](/specs/context-assembly.md), whose
rules hold here unless a rule below says otherwise (TP-30 to TP-35 for parsing, CA-11 for estimation,
CA-50 for determinism).

# Data under lantern/2

The core is [domain-model](/specs/domain-model.md) DM-60 to DM-64; this is what the Choose room
puts in `data` and which values it allows (DM-66).

- **CP-1** Values. `kind`: `subject`, `concept`, `need`, `criterion`, `family`, `product`, `own`.
  `state` per kind as CR-21; the subject node's state is `lit` once introduced (its status is in the
  visit, CP-2). `task`: `intro`, `light`, `more`, `reply`, `find`, `fill`, `check`, `recommend`.
- **CP-2** **Visit `data`**:

| Field | Rule |
|---|---|
| `tone` | required, as Learn (DM-65, CR-81) |
| `needsNote` | optional, the Welcome needs text (CR-13), at most 500 characters, shown at the top of the needs card as *In your words*, editable any time, never split or rewritten by the room *(round 7, q-r7-needs-note)* |
| `locale` | required: `{country, currency}`, ISO 3166 alpha-2 and ISO 4217, from Settings → Choose room when the subject is created; changed in the subject menu for future calls only, like tone *(round 7, q-r7-locale)* |
| `status` | required: `exploring`, `decided` or `bought` (CR-24) |
| `pick` | optional, the last chosen product: `{productId, title, price?, at}`, `price` the value of its *Price* fact; written when a product is chosen and refreshed from that product before every save, kept after un-choosing so the Gallery can show it struck (CR-24) *(B4, agreed by the user 2026-10-15.)* |
| `history` | required, append-only: `[{status, at, productId?, unchosen?}]`, one entry per status change, un-choosing included (`status: "exploring"`, `unchosen: true`, the product's id) |

- **CP-3** **Node `data`**, by kind:

| Kind | Field | Rule |
|---|---|---|
| `need` | `answer` | `{text, at, by}`, text at most 500 characters, the user's words; present exactly when `state` is `answered` |
| `criterion` | `measure` | optional, `"price"` on the one criterion that holds prices (at most one per visit); its cells carry the price caution (CR-41) |
| `product` | `facts` | `[{label, value, sources}]`, at most 12, from `find` or `check` |
| `product` | `cells` | `{<criterionId>: Cell}`, the product's Compare column (CP-5) |
| `product` | `rejected` | `{reason, at}`, present exactly when `state` is `rejected`; the reason is the user's, at most 200 characters |

  A criterion's *why it matters for this user* is its `hook` (CR-20); no extra field.
- **CP-4** **Source**: `{kind, name, url?, read, value?}`. `kind` is `manufacturer`, `measured`
  (independent measurement or review), `shop` (price and availability only) *(round 7, q-r7-rules)*, `opinion`
  (communities, CR-42 rule 3), `sponsored` (known sponsored or affiliate, rule 5) or `model` (the
  model's own knowledge). `name` at most 80 characters; `url` an `https` URL, shown, never fetched
  by the app; `read` the date it was read, `YYYY-MM-DD`, or for `model` the model's knowledge date
  `YYYY-MM`; `value` what this source says, when sources disagree.
- **CP-5** **Cell**: `{value, note?, disagree?, sources, user?, generationId, at}`. `value` is a
  string of at most 160 characters or `null` (nothing found); `note` at most 200 characters;
  `user` is `{value, at, by}` when the user saved their own (CR-51; the room's value stays beside
  it, DM-16). The status the design shows is derived, never stored: `edited` when `user` is set,
  else `none` when `value` is null, else `disagree` when `disagree` is true, else `ok`; `filling`
  exists only while a call runs (LR-2). A cell whose criterion is deleted is dropped on save.
- **CP-6** **Record `data`**: `tone` (required, as Learn) and `web` (required, whether the call had
  the web tools). Web calls are counted in the core `toolCalls` (DM-64).
- **CP-7** Validation (DM-66) refuses a file that breaks CP-2 to CP-6: a `need` answered without
  `answer`, a `rejected` without reason, two `chosen` products (CR-22), a `status` that does not
  match the chosen product (`decided` or `bought` exactly when one product is `chosen`), a second
  price criterion.

# Tasks

- **CP-10** Which action sends which task, and with which tools:

| Task | Sent by | Web (when *Use the web* is on) | Result |
|---|---|---|---|
| `intro` | *Light it up* on the subject | no | the subject's text, then 3 children |
| `light` | *Light it up* on a `concept` or `own` node | no | the text, then 3 children; the node becomes `lit` |
| `light` | *Explain* on a `need` or `criterion` | no | the text only; the state does not change *(round 7, q-r7-explain)* |
| `find` | *Light it up* on a `family`; *Find products* on the board or the subject | yes | the family's text (on a family), then up to 3 `product` children with facts and sources |
| `more` | *More options* on a lit node | no (yes under a family: it is a `find`) | 3 more children |
| `reply` | a message on any node | no | a model turn; optionally a need to record and a branch |
| `fill` | automatic, CP-40 | yes | Compare cells |
| `check` | *Check this* on a node, a reply, a cell or a row | yes; hidden when off (CR-44) | a model turn with the verdict; refreshed facts or cells |
| `recommend` | *Recommend* on the board or the rail | no | a model turn on the subject node with the pick |

- **CP-11** With *Use the web* off, `find` and `fill` still run, from the model's knowledge, and
  every source they return is `kind: "model"` with the knowledge date (CR-44) *(round 7, q-r7-rules)*.
- **CP-12** `recommend` never chooses: the panel shows the answer with *Choose <product>* when it
  names one. Its answer is a model turn on the subject node, so it stays readable and editable like
  any reply (CR-61, *the answer appears in the reading panel*).
- **CP-13** A `check` never overwrites the user's own value (CP-5 `user`); it updates the room's
  value beside it, and the turn says what changed. On a concept or a reply, the verdict is the turn.

# System prompt (`promptVersion: choose-1`)

- **CP-20** Sections, in order and only these: ROLE, METHOD, NEEDS, SOURCES, TONE, USER
  CORRECTIONS, LINKS, LANGUAGE, FORMAT, PROTOCOL. It is the same for every task of a given tone and
  web setting; `{{WEB_LINE}}` is one of the two sentences of CP-21. The tone lines are TP-10's,
  with *learner* read as *user*.
- **CP-21** `{{WEB_LINE}}`: on, *In research tasks you can search the web and read pages; nothing
  else. Outside research tasks, do not search.* Off, *You have no web access. Every product fact
  comes from your own knowledge: mark its source as kind "model" with your knowledge date, and say
  that prices may have changed.*
- **CP-22** Prompt versions are `choose-<n>`, bumped as TP-20, recorded per call (TP-21), kept only
  after the evals pass (TP-22, CP-60).

````text
ROLE
You help the user choose something they know little about, usually a product to buy. They explore a map one node at a time; a board beside it collects their needs, the criteria they ranked, the products they shortlisted and their pick. You explain just enough to decide, find real products, compare them on the user's criteria, and recommend when asked. The decision is theirs.

METHOD
- Every explanation serves the choice: say why it matters for deciding, in this user's situation. No history, no trivia, no understanding checks.
- Cover only the node in focus; other nodes are for later. Teasers are a title plus one line of hook.
- When asked for options, give exactly 3, genuinely distinct, mixing kinds: a concept to understand, a need to ask the user about, a criterion to compare on, a family of products.
- Never propose anything already in the map, in any state. Nodes marked [dismissed] were declined: do not propose them or a rewording of them.
- Do not re-explain what is lit elsewhere: link to it.
- Never decide for the user. When recommending, name one product, why it fits their needs and must criteria, and what they give up compared with the others.

NEEDS
The NEEDS block is the user's own list. Never add to it, change it or assume an answer it does not give. When the user mentions a need in conversation, you may offer to record it with the need block, in their words; they confirm. Ask about a need only when the answer would change the choice, and say why it matters.

SOURCES
{{WEB_LINE}}
1. Manufacturer specifications are the source for specs.
2. Independent measurements and reviews are preferred for performance and quality.
3. User communities (forums, Reddit…) are experience reports: mark them as opinion.
4. Affiliate "best of" lists and sponsored rankings are never the basis of a fact or a recommendation.
5. A source known to be sponsored or affiliate is marked as sponsored.
6. Every product fact has its source and the date you read it. A price is an indication at that date, in the user's currency, from a shop in the user's country when there is one; never a promise.
7. When sources disagree, say so and give each value; never pick one silently.
If you found nothing reliable, say so: an empty value is better than a guess.

TONE
{{TONE_LINE}}

USER CORRECTIONS
The user can edit titles, hooks, explanations, your replies and Compare values. Anything marked "(corrected by the user)" or "(the user's value)" is true by decree: build on it and never silently revert it. If you have a strong reason to doubt it, say so once, in one sentence.

LINKS
When you mention another node of the map, link to it as [its title](node:<id>), with the id exactly as shown in the MAP or BOARD. Never invent an id, and never put links inside the machine-readable blocks.

LANGUAGE
Write in the language of the subject title, unless the user writes to you in another language: then follow the user. Block tags and JSON keys stay in English.

FORMAT
Markdown with light formatting: short paragraphs, bold for key terms, lists or a small table when they help. No top-level heading, no preamble, no closing pleasantries.

PROTOCOL
The app parses machine-readable blocks at the very end of your reply and hides them. Write a block only when the TASK asks for it, exactly as shown, after all prose, with nothing after it. Never mention the blocks.
A source is {"kind": "manufacturer|measured|shop|opinion|sponsored|model", "name": "...", "url": "https://...", "read": "YYYY-MM-DD"}; for kind model, "read" is your knowledge date as "YYYY-MM" and there is no url.
- Options: <options>[{"title": "...", "hook": "...", "kind": "concept|need|criterion|family"}]</options>  exactly 3; title at most 60 characters, hook one line at most 120 (for a criterion: why it matters for this user; for a need: the question's reason).
- Products: <products>[{"title": "...", "hook": "...", "family": "<id or new family title>", "facts": [{"label": "...", "value": "...", "sources": [...]}]}]</products>  at most 3 real models currently sold; the price is a fact labelled "Price".
- Cells: <cells>[{"product": "<id>", "criterion": "<id>", "value": "..." or null, "note": "...", "disagree": true|false, "sources": [...]}]</cells>
- Facts (check on a product): <facts>[{"label": "...", "value": "...", "sources": [...]}]</facts>
- Need (replies only, at most one): <need>{"question": "...", "answer": "the user's own words"}</need>
- Branch (replies only, at most one): <branch>{"title": "...", "hook": "...", "kind": "concept|need|criterion|family"}</branch>
- Recommendation: <recommend>{"product": "<id>" or null, "confidence": "low|medium|high", "missing": ["..."]}</recommend>
````

# Task templates

Slots as TP-12: each template ends with its required ending; blocks are those of CP-50.

| Task | Required ending |
|---|---|
| `intro` | prose (what the field is and the 2 or 3 things that decide a choice in it, for this user's needs), then `<options>` with 3 entries, at least one `need` |
| `light` (concept, own) | prose, then `<options>` with 3 entries |
| `light` (need, criterion) | prose only: why it matters for this choice, and how answers or values change it |
| `find` | prose (on a family: the family; otherwise one line per product found), then `<products>`; no product already in the map |
| `more` | `<options>` only |
| `reply` | prose, then optionally `<need>` and `<branch>`; never `<options>` |
| `fill` | `<cells>` only, exactly the cells listed in TARGET |
| `check` | prose (what was checked, what holds, what changed, with sources), then `<facts>` (product) or `<cells>` (cell, row) when something changed |
| `recommend` | prose (the pick, why, what is given up; or what is missing and how sure), then `<recommend>` |

- **CP-30** Applying blocks (LR-1 atomic, LR-43 checked at application):
  1. `<options>` and `<branch>` follow LR-60 to LR-62 (count, duplicates, dismissed); an unknown
     `kind` takes `concept`.
  2. `<products>`: a product whose title matches a node is dropped (LR-62). `family` naming an
     existing family id attaches the product under it; a new title creates an `open` family under
     the subject first; on a family, products go under it whatever `family` says. New products are
     `candidate`.
  3. `<cells>`: only cells listed in TARGET are written; others are ignored. A `user` value is
     never touched (CP-13).
  4. `<need>` is not applied: the panel shows *Add to needs: <question> — <answer>* with *Add* and
     *Ignore*; *Add* creates an `answered` need under the subject, `createdBy: user`.
  5. `<recommend>`: `product` must be a shortlisted or chosen product's id, otherwise it is read
     as `null`. The turn is stored; nothing changes state. *(B4 slice 2, agreed by the user 2026-10-15.)* A missing or invalid `confidence` reads `low`;
     `missing` keeps at most 8 entries of 120 characters.
- **CP-31** **Source checks** (CR-41, CR-42), applied to every fact and cell *(round 7, q-r7-rules)*:
  1. a value with no source, or a source with no valid `read` date, loses that source; a value left
     with no source is stored as `null` (*nothing found*);
  2. a value whose only sources are `sponsored` is stored as `null`, and the sponsored sources are
     kept and shown struck (*not used*);
  3. a `read` date later than today is invalid; a `model` source is valid only with web off or in a
     task without web.

  *(B4 slice 2, agreed by the user 2026-10-15.)* A `model` source is valid exactly when the call had no web tools; other kinds are kept
  with web off. A **fact** left with no source, or with sponsored sources only, is dropped, since a fact
  cannot be `null`; only cells keep `null` with the sponsored sources shown struck. A source with a bad
  `url` (or a `url` on a `model` source) loses the `url` and is kept; an unknown `kind` or a bad `read`
  drops it. Values are clipped to their limits; option and product titles to 80 characters and hooks to
  160, as Learn.
- **CP-32** Visible text (TP-32) also cuts at `<products>`, `<cells>`, `<facts>`, `<need>` and
  `<recommend>`. With web on, text the model writes before its first tool call is not the answer
  (choose-web-tools decision 3): the visible text is the text after the last tool result. *(B4 slice 2, agreed by the user 2026-10-15.)* The
  session does that cut from the provider's tool events (IP-13); `visibleText` cuts only at the tags.

# Context assembly

- **CP-50** Blocks, built by the room's pure `buildContext(visit, task, focusId, {budgetTokens,
  today})` (CA-1, CA-50: `today` is an argument, never the clock):
  - `SUBJECT_BLOCK` as CA-2.
  - `LOCALE_BLOCK`: `USER'S COUNTRY: FR · CURRENCY: EUR · TODAY: 2026-10-15`.
  - `NEEDS_BLOCK`, in **every** call (CR-31): the needs note under `IN THE USER'S WORDS:`, then each
    answered need as `- <id> <question>: <answer>`, then `STILL OPEN:` with each open need's id
    and question. An empty list reads `NEEDS: none yet`.
  - `BOARD_BLOCK`, in every call but `intro`: criteria grouped `MUST`, `NICE`, `TO RANK`,
    `IRRELEVANT` (id, title, hook); `SHORTLIST` (id, title, the chosen one marked); `REJECTED` (id,
    title, the user's reason); `STATUS`.
  - `MAP_BLOCK`, `PATH_BLOCK`, `PARENT_BLOCK`, `FOCUS_BLOCK`, `DIALOGUE_BLOCK`, `EXISTING_CHILDREN`
    as CA-20 to CA-35, with Choose's marks: `open`, `lit`, `answered`, `must`, `nice`,
    `irrelevant`, `candidate`, `shortlisted`, `chosen`, `rejected`, `dismissed`.
  - `COMPARE_BLOCK`: one line per cell of the shortlist × must and nice criteria,
    `<product id> × <criterion id>: <value> [<source kinds>, <oldest read date>]`, with
    `(the user's value)` and the room's value beside it when edited, `≠` when `disagree`, `nothing
    found` when `null`; each line at most 300 characters.
  - `TARGET` (fill only): the cells to fill, `<product id> × <criterion id> (<criterion title>)`.

  *(B4 slice 2, agreed by the user 2026-10-15.)* Formats the rules above leave open are the code's (`app/src/rooms/choose/context.ts`): map
  lines `- <id> [<kind>:<state>] <title> — <hook>`; NEEDS under `ANSWERED NEEDS:` and `STILL OPEN:`,
  dismissed needs left out; BOARD's empty groups left out and `STATUS` last; COMPARE lines for stored
  cells only, `≠ ` before a disputed value; a product's facts in its FOCUS block. The task templates'
  prose is the code's (only the system prompt above is verbatim) and is judged by the evals (CP-60).
- **CP-51** Matrix:

| Task | Subject, locale, needs | Board | Map + path | Parent clip | Focus | Dialogue | Compare | Target |
|---|---|---|---|---|---|---|---|---|
| `intro` | yes | - | - | - | - | - | - | - |
| `light` | yes | yes | yes | yes | - | - | - | - |
| `find` | yes | yes | yes | yes (on a family: its parent) | on a family: no | - | - | - |
| `more` | yes | yes | yes | - | yes | - | - | - |
| `reply` | yes | yes | yes | yes | yes | yes | yes when the focus is a product or the subject | - |
| `fill` | yes | yes | - | - | - | - | yes | yes |
| `check` | yes | yes | yes | - | yes | the turn checked | yes on a product, cell or row | - |
| `recommend` | yes | yes | yes | - | - | - | yes | - |

  *(B4 slice 2, agreed by the user 2026-10-15.)* `check` on a reply names the checked turn by its index in the focus node's dialogue (sent
  as `TURN TO CHECK`). `check` on a single cell has no TARGET in this matrix, so it checks the cell's
  product (or row) and the session keeps only that cell's result.

- **CP-52** Budget: the map budget is Learn's setting (CA-10) and covers the map part only, reduced
  as CA-21. Needs, board and Compare are never reduced: the needs note is at most 500 characters,
  answers 500 each, and Compare at most 300 characters a line (about 5 products × 12 criteria, under
  20k characters).
- **CP-53** Unit tests as CA-52, plus: an empty needs list gives `NEEDS: none yet`; an edited cell
  shows both values; `today` changes only `LOCALE_BLOCK`; a board change never changes the map part.

# Compare filling

- **CP-40** The room fills cells on its own (CR-51): shortlisting a product queues its column
  (must and nice criteria), adding or ranking a criterion `must` or `nice` queues its row for the
  shortlist, and *Fill Compare* on the board queues every empty cell (a cell with no stored value; a
  *nothing found* cell counts as filled, *(B4 slice 2, agreed by the user 2026-10-15.)*). Queued cells are coalesced
  into `fill` calls of at most one product column or one criterion row, oldest first, shown
  striped (*Researching…*). Cancel stops the running call and drops the queue.
- **CP-41** A **research lane** *(round 7, q-r7-fill)*: one `fill` call at a time per subject runs alongside the one
  generation of LR-40 (amended for Choose, CR-80). A fill writes only cells, so it never blocks *Light it up*,
  a reply or *Recommend*; it is applied atomically and checked against the graph when it lands (LR-1,
  LR-43): cells of a product no longer shortlisted, or of a criterion no longer `must` or `nice`, are dropped. The
  lane has its own Cancel in the research line (CR-51 design). Every other task, `find` and `check` included,
  uses the one generation of LR-40.

# Evals for `choose-1`

- **CP-60** Cases, on a fixture *3D printer* subject (needs answered, criteria ranked, 3 shortlisted):

| # | Check |
|---|---|
| 1 | `intro`, `light`, `more`: exactly 3 valid options, at least one `need` in `intro`, no title already in the map |
| 2 | Never writes the user's needs: no answer invented in prose, `<need>` only after the user stated it, in their words |
| 3 | `find`: at most 3 real products, none in the map, each with a price fact in the user's currency, every fact with a source and a date |
| 4 | Source rules: no fact backed only by an affiliate or sponsored source; sponsored marked; communities as `opinion`; specs from the manufacturer |
| 5 | Disagreement: on a seeded case where two sources differ, `disagree: true` with both values |
| 6 | `fill`: exactly the TARGET cells, ids from the board, `null` with a note rather than a guess |
| 7 | User's values: a corrected cell is never contradicted silently |
| 8 | Web off: every source `kind: "model"` with a knowledge date; prices called indications that may have changed |
| 9 | `recommend`: names a shortlisted product, links its reasons to must criteria and needs, says what is given up; on an incomplete board, lists what is missing and gives `low` or `medium` |
| 10 | Language follows the subject title; links use existing ids only |

- **CP-61** **Every case runs on the default model** (Opus 5.5, medium effort) *(round 7, q-r7-evals)*, at the PQ-33
  bar (95 %). The research cases (3 to 6, 8) run twice, since web answers vary. This departs from PQ-30
  (Haiku) for Choose only: Haiku broke the source rules in the spike
  ([choose-web-tools](/decisions/choose-web-tools.md)), and the evals should test the model the room
  actually uses. A full run is about 20 research calls, roughly $5 at API prices; the runner prints the
  cost (PQ-34).

# Open

None. The user found the draft good as a whole (q-r7-anything, *all good*).

Related: [choose-room](/specs/choose-room.md), [tutor-protocol](/specs/tutor-protocol.md),
[context-assembly](/specs/context-assembly.md), [domain-model](/specs/domain-model.md),
[choose-web-tools](/decisions/choose-web-tools.md), [platform-quality](/specs/platform-quality.md).
