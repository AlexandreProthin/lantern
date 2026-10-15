# Choose nodes — final design

Selected on 2026-10-15 by explicit user instruction in chat: "r003-02 is the final". Saved request revision 4 picks
r001-01, r002-01, r003-02 with the prompt "final" (not consumed by a round; finalization needs none).

- Winner: **r003-02 — Fill and turn** (motion), on r002-01 (colour) and r001-01 (structure).
- Final snapshot: [choose-nodes-fin-r003-02.html](final/choose-nodes-fin-r003-02.html), a byte-exact copy of
  [choose-nodes-mot-r003-02.html](motion/choose-nodes-mot-r003-02.html). Its experiment header stays as provenance.
- Shared files, loaded as `../…` (same from `final/` as from `motion/`):
  [choose-nodes-data.js](choose-nodes-data.js) (the 3D printer graph and the state sheet),
  [assets/node-kit.js](assets/node-kit.js) (page frame, tree layout, selection, panel, state sheet, legend),
  [assets/glyphs-r001-01.js](assets/glyphs-r001-01.js) (the node drawing, frozen from r001-01),
  [assets/node-kit-room.js](assets/node-kit-room.js) (Choose tokens, type, Learn's looks, glass, backdrop),
  [assets/node-motion.js](assets/node-motion.js) (reduced motion, ghosts, story player),
  [assets/backdrop.js](assets/backdrop.js) (copy of the final backdrop, as in choose-palette).
- Prototype controls, not part of the design: *Try a state* in the panel, the story pill (*Play the story*, *Step*,
  *Reset*, *Reduce motion*, bottom left), the corner tag, the tree layout and the "Every state" sheet.

## What it is

**Kind inside, state around.** Every node is Learn's disc with its title beside it (beneath it in Learn's desktop map;
the graph's layout is not part of this design). The **pictogram inside names the kind**; the **ring gives one of
four looks** (dotted open, glowing lit, filled settled, faded); a **badge on the rim gives the exact state**. The graph
stays quiet: a rejected product's reason is in its tooltip, accessible name and the panel, never on the graph.

## Decisions and ancestry

| Round | Design | Parents | Decision |
| --- | --- | --- | --- |
| 1 wireframe | r001-01 Kind inside, state around | none | **Kept**: the encoding above. Not kept: r001-02 Shape is the kind, glyph is the state (a silhouette per kind, status glyph inside); r001-03 One shape, state in words (a kind word above the title, the state as a line of words). |
| 2 colour | r002-01 Learn's settled light | r001-01 | **Kept**: Learn's node colours one to one, in teal; no red. Not kept: r002-02 Graded teal (teal by firmness, rejected badge in `--error`); r002-03 One light on the pick (settled outlined, only the pick filled, route to it in accent). |
| 3 motion | r003-02 Fill and turn | r001-01, r002-01 | **Final.** Not kept: r003-01 Quiet cross-fade; r003-03 Embers on the decision (Learn's particles and travelling light). |

Form and type were not run as rounds. Per the round 2 brief ("pick the missing choices from other choose room design
round to keep it uniform"), they come from the settled designs: Learn's final node form and choose-board r003-01 type.

## Verbatim inputs

| Round | Saved prompt (picks, phase, mode) |
| --- | --- |
| 1 | Choose's node glyphs and states. One glyph per kind (subject, concept, need, criterion, family, product, own) and how every state reads on the graph: concept/family open→lit; need open→answered; criterion open→must/nice/irrelevant; product candidate→shortlisted→chosen or rejected with a reason; dismissed for any kind. Include the legend rows. Write the shared data file first with hard cases (long labels, a rejected product, a dismissed node, many products in a family, one chosen product). Wireframes must differ in mechanism (how kind and state are encoded), not in looks. (none, wireframe, combine; from the user's chat brief) |
| 2 | Then jump to the color round and pick the missing choices from other choose room design round to keep it uniform. if in doute of anything ask me.<br>To keep the lantern feeling over the room stay coherent with the already designed learn room (r001-01, color, combine) |
| 3 | next (r001-01, r002-01, motion, combine) |
| final | final (r001-01, r002-01, r003-02; plus chat "r003-02 is the final") |

How the inputs were read. Colour: a **direction** ("coherent with the already designed learn room"), not a scheme;
the palette is the accepted Choose palette (CR-70), so the round varied how node states use its tokens. Motion: "next"
= continue in Learn's spirit; only state changes were designed, since selection, the route light, spawn and busy are
already the graph's (graph-view GV-31 to GV-98).

## Structure (r001-01)

| | |
| --- | --- |
| Disc | 44 px circle, 1 px ring; the subject 54 px (title 600). Title 13 px / 1.5, 400, to the right, 12 px gap, 150 px column (GV-24 wraps and clips apply) |
| Pictogram | 18 px, stroke 1.4, round caps, centred, `currentColor` |
| Badge | 20 px circle on the rim, top right (−7 px, −7 px), 1 px ring; 10 px glyph, stroke 1.5 |
| Chosen | a second ring 6 px outside the disc |
| Dismissed | title struck through |

| Kind | Pictogram |
| --- | --- |
| subject | target (two concentric circles) |
| concept | *i* (dot over a stem) |
| need | question mark |
| criterion | balance |
| family | three clustered circles |
| product | box (isometric cube) |
| own | pen |

| State | Look (ring) | Badge |
| --- | --- | --- |
| concept, family, own: `open` · product: `candidate` | open (dotted) | none |
| concept, family, own: `lit` | lit (glow) | none |
| need: `answered` | settled (filled) | check |
| criterion: `must` / `nice` | settled | `!` / `+` |
| criterion: `irrelevant` | quiet (solid grey ring, mute title) | `–` |
| product: `shortlisted` | settled | bookmark |
| product: `chosen` | settled + second ring + glow | star |
| product: `rejected` | faded | × |
| any but subject: `dismissed` | faded, title struck | none |
| subject: `exploring` / `decided` / `bought` | lit / lit / settled | ellipsis / check / bag |

The SVG paths are in [glyphs-r001-01.js](assets/glyphs-r001-01.js). Accessible name: *title · kind · state*, plus the
answer when answered and the reason when rejected (GV-23 extended).

## Colour (r002-01, Choose tokens only, `:root[data-room="choose"]`)

| Element | Tokens |
| --- | --- |
| Open | `--bg` fill, dotted `--node-open` ring and pictogram (Learn) |
| Lit | `--surface-2` fill, `--node-lit` ring and pictogram, `0 0 14px 2px --glow-near, 0 0 38px 9px --glow-far` (Learn) |
| Settled | `--node-understood` fill and ring, `--accent-ink` pictogram (Learn's understood) |
| Settled badge | `--bg` fill, `--node-understood` ring and glyph |
| Other badges | `--bg` fill, `--node-lit` ring and glyph; faded: `--node-open` |
| Chosen | settled + the lit glow; second ring `--focus` |
| Irrelevant | `--bg` fill, `--line` ring, `--ink-mute` pictogram, badge and title |
| Rejected, dismissed | `--bg`, dashed `--node-open` ring, opacity .45, `--ink-mute` title; struck in `--ink-faint` |
| Subject decided / bought badge | `--node-lit` ring and glyph |
| Edges | `--path-muted` 1.2 px; to a dismissed node `--line`, dashed 3/4 |
| Selection, hover | `--focus` outline 1 px, 6 px out (10 px around a chosen node); hover ring `--focus` (Learn) |

Token values are those of [choose-palette/RECIPE.md](../choose-palette/RECIPE.md) (CR-70). No red: the room's
`--error` is not used by nodes.

## Motion (r003-02)

Easing: out `cubic-bezier(.2,.7,.2,1)`, in `cubic-bezier(.5,0,.8,.4)` (as the board). Event-driven only; nothing
loops. A state's **rank** orders the looks: faded (rejected, dismissed) 0 < open, candidate, irrelevant 1 < lit,
exploring, decided 2 < answered, must, nice, shortlisted 3 < chosen, bought 4.

| Change | Motion |
| --- | --- |
| Rank goes up (settle, light, choose, buy) | the new disc **fills from its centre**: `clip-path circle(0% → 110%)`, 360 ms out, over the old look, which is removed at the end; the badge **comes out of the disc onto the rim**: from `translate(−19px, 19px) scale(.3)`, opacity 0, 240 ms out, starting at 200 ms |
| Rank goes down (un-settle, un-choose, reject, dismiss, irrelevant) | the old look **closes into its centre**: `clip-path circle(110% → 0%)`, 300 ms in, its title fading over 200 ms, revealing the new look |
| Same rank, badge only (e.g. nice ⇄ must) | the badge **turns over**: `perspective(60px) rotateY(90deg) → none`, 220 ms out |
| Chosen | after the fill, the second ring opens outward: `scale(.8) → 1`, opacity 0 → 1, 320 ms out, starting at 300 ms |
| A glow appears (lit, chosen, subject exploring/decided) | it blooms from nothing to its static value, 480 ms out, starting at 120 ms (300 ms for chosen) |
| Side effects | every node whose state changes animates at once: choosing another product closes the old pick back to shortlisted while the new one fills (CR-22); the subject's status changes with it (CR-24) |

No particles and no travelling light on state changes; the graph's route light and spawn effects are unchanged.
Reduced motion (OS setting or Appearance → Always reduce, GV-100): every change is instant, and a change of the
setting or the page being hidden cancels transient animation. Every animated state is the static render (GV-103).

## For the implementation

- **Spec:** [choose-room](../../agent_wiki/specs/choose-room.md) CR-20 and CR-21 record the pictograms, looks and
  badges. graph-view's node rendering table (GV-20 to GV-22) is Learn's and stays as is; Choose renders per CR-20/21.
- **Open — dismissed opacity:** graph-view says a dismissed node renders at **at most 35 %** opacity; the palette
  sheet and this design use **45 %**. To settle at implementation: GV's 35 % is the recommendation, since it is the
  existing rule for the graph.
- **GV-20 (without colour, 38 px):** the looks differ by line (dotted / solid / dashed), fill and glow, and the exact
  state by the badge glyph. The 38 px mobile size and the badge size there were not designed; to check at
  implementation.
- **Data:** the state model the prototype follows (one chosen product, un-choose → exploring, dismissed from open or
  candidate only, open and dismissed nodes are leaves as LR-39) is in [assets/node-kit.js](assets/node-kit.js).
- **Not designed here:** where titles sit on the desktop map (Learn: beneath), the legend's position (GV-52), small
  zoom without titles (GV-62).
