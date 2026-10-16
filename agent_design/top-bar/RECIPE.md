# Top bar — final design

Selected on 2026-10-17 by explicit user instruction in chat: "r005-02 is the one to call final". The last saved
request (revision 6, prompt "final") picks the same line: r001-01, r001-02, r001-03, r001-05, r002-03, r003-01,
r004-03, r005-02.

- Winner: **r005-02 — Gliding marker** (motion), on r004-03 (colour), r003-01 (form), r002-03 (structure, from
  r001-01, r001-02, r001-03 and r001-05). Type is the app's own (no type round, at the user's request: "for the type
  keep things coherent").
- Final snapshot: [top-bar-fin-r005-02.html](final/top-bar-fin-r005-02.html), a byte-exact copy of
  [top-bar-mot-r005-02.html](motion/top-bar-mot-r005-02.html). Its experiment header stays as provenance.
- Shared files, loaded as `../…` (same from `final/` as from `motion/`): [top-bar-data.js](top-bar-data.js) (rooms,
  spaces, stats wording, subjects, the four states), [assets/bar-kit.js](assets/bar-kit.js) (the page, glyphs, mark,
  window controls), [assets/bar-motion.js](assets/bar-motion.js) (the live marker, panel and room switch). Prototype
  controls, not part of the design: *Play the sequence*, *slow ×4*, the state captions; the panel's rooms list is a
  stand-in for the palette's real content. In the prototype a room switch only recolours (the capsule keeps the old
  room's spaces).
- Component exception (AGENTS.md): round 1 held five proposals on one review sheet per round; rounds 2–5 held three.

## What it is

One 56 px bar that is also the window's title bar. Left to right:

1. **Lantern mark** (26 px): goes to the room's Welcome. The flame is the room accent (RS-53 as amended).
2. **The capsule**, one outlined group (36 px tall, radius 18, `--line` outline):
   - the **room name** with a caret: opens the room menu (rooms, each with its lantern colour, Ctrl+Shift+N);
   - the **spaces** as words with a glyph (13 px), never boxed. The current one is ink, with a 1 px ink underline and
     a 5 px accent dot at its top right; the others are `--ink-mute`;
   - **settings** (gear glyph) as the capsule's last segment, ending the left cluster, one click away.
3. **The field**, centred in the window (34 % of the width, 28 % at 1024 px; 34 px tall, radius 17): the subject
   title (13 px, 500), *Ctrl+K* at its right. With no subject: *Open a subject…*.
   - a click on the field, or Ctrl+K, opens **one panel**, centred under the field just below the bar: this
     subject's settings on top (Title with rename, Tone, Direction, Model, Effort — today's subject menu, RS-15/RS-19),
     then the palette (a filter field, other subjects, rooms, Settings);
   - the panel closes with Esc, a second click on the field, or **a press anywhere outside it** (user, 2026-10-17, at
     the final: "clicking outside the deployed panel (Ctrl + k) should close it too"; the prototype does this since
     the final, through the shared `bar-motion.js`).
4. **Stats** in settings' old place, before the window controls (12 px, `--ink-mute`), token hover as today.
5. **Window controls**, flush right (unchanged from RS-12 item 7).

Dragging: the empty space between groups and **a strip along the top of the bar**, above the capsule, the field and
the stats, drag the window (requested in chat before round 3, "if the red part can drags the windows"). The top 3 px
stay the resize edge. In r003-01's 56 px bar the strip is 7 px.

At 1024 px (RS-18): the space words fold to their glyphs, the field narrows to 28 %, the stats hide. The mark, the
capsule (room, spaces, settings), the field and the window controls never disappear.

## Verbatim inputs

| Round | Phase | Picks | Saved prompt |
| --- | --- | --- | --- |
| 1 | wireframe, 5 proposals | — | The brief drafted from the user's answers (B1, B2) in chat; see `lineage.json` round 1. |
| 2 | wireframe | r001-01, r001-02, r001-03, r001-05 | "Things i like per proposition: r001-01: Spaces are words with a glyph, current one is clear. Settings ends the left cluster · r001-02: stats where settings was · r001-03: the capsule · r001-04: not that one · r001-05: the command field/palette (Ctrl+K) centered" |
| 3 | form | + r002-03 | (empty). Chat: "if the red part can drags the windows i think it could be great" |
| 4 | color | + r003-01 | "make sure the room / space menu open is centered/well placed. Next is color (for the type keep things coherent)" |
| 5 | motion | + r004-03 | (empty) |
| final | — | + r005-02 | "final". Chat: "r005-02 is the one to call final. note: clicking outside the deployed pannel (Ctrl + k) should close it too" |

The colour input was read as a direction, not a scheme: the rooms' own binding palettes, three ways to spend them.

## Form (r003-01, calm and roomy)

Bar 56 px · gaps 14 px · mark 26 px · capsule 36 px (inner buttons 34 px, padding 0 9 px, separators 18 px) · space
labels 13 px · field 34 % × 34 px · title 13 px / 500 · stats 12 px · top drag strip 7 px under a 3 px resize edge.

## Type

The app's: `'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif`, at the form's sizes. Shortcuts in the
panel use the kit's monospace hint style (11 px).

## Colour (r004-03, quiet bar, lit field)

Only room tokens (rooms-spaces RS-31; `app/src/ui/app.css`, `app/src/rooms/choose/choose.css`):

| Token | Learn | Choose | Used for |
| --- | --- | --- | --- |
| `--bg` | `#101827` | `#101827` | window, panel inputs |
| `--surface` | `#172132` | `#172132` | bar glass (55 %, blur 20 px), panel |
| `--ink` | `#f3e9dc` | `#f3e9dc` | current space, title, underline |
| `--ink-mute` | `#aeb3bf` | `#aeb3bf` | other spaces, carets, stats, settings, window controls |
| `--line` | `#3b4558` | `#3b4558` | capsule outline, separators, panel border |
| `--accent` | `#e8b66e` | `#5cc6bd` | flame, current-space dot, field edge (45 %), field wash (6 % over `--bg`), *Ctrl+K*, panel current-row edge (2 px) |

The bar's bottom line is `--ink-mute` at 16 %. Close hover stays Windows red `#c42b1c` (as shipped).

## Motion (r005-02, gliding marker)

- Space switch: the underline and the dot glide to the new space, 240 ms, `cubic-bezier(.2,.8,.2,1)` (left and width).
- Hover on a space: colour 120 ms.
- Field hover: the accent edge goes from 45 % to 70 %, 180 ms.
- Panel open: grows out of the field — a clip from the field's width and height to the panel's, 220 ms
  `cubic-bezier(.2,.8,.2,1)`, with an 80 ms fade and a 16 px rise into place. Close: folds back into the field,
  160 ms ease-in, fading out after 40 ms.
- Room switch: the spec's 0.45 s token crossfade (RS-30), flame included.
- Reduced motion: everything instant (RS-33, GV-100–103).

## Decisions and ancestry

| Round | Designs | Picked | Decision |
| --- | --- | --- | --- |
| 1 wireframe | r001-01 Lamp and room as one chip, r001-02 A path you can open at every step, r001-03 One capsule holds the room, r001-04 The lantern is the app menu, r001-05 A command field in the middle | 01, 02, 03, 05 | Labelled spaces and settings ending the left cluster (01), stats in settings' place (02), the capsule (03), the centred Ctrl+K field (05); not the app menu (04). |
| 2 wireframe | r002-01 Capsule left, field centre; r002-02 The room lives in the field; r002-03 One field for the subject, menu included | r002-03 | The room stays in the capsule; the subject menu becomes the top of the palette. |
| 3 form | r003-01 Calm and roomy, r003-02 Compact title bar, r003-03 Title leads | r003-01 | Today's 56 px height with more air; plus the top drag strip from chat. |
| 4 colour | r004-01 Accent marks the place, r004-02 A lit capsule, r004-03 Quiet bar, lit field | r004-03 | Colour leads to the field; the panel centred under the field. |
| 5 motion | r005-01 Still and quick, r005-02 Gliding marker, r005-03 The lantern relights | **r005-02** | Final; outside-press closes the panel. |

## For the implementation

Spec changes this design needs, to agree in chat before building (rooms-spaces):

- **RS-12** new order and contents: mark · capsule (room ▾, spaces, settings) · centred field · stats · window
  controls. The room chip joins the capsule; settings moves from the far right into the capsule; stats move to just
  before the window controls; the subject title becomes the field.
- **RS-15 / RS-16 / RS-17 / RS-19**: the subject menu becomes the top section of the field's panel, with the same
  fields and rules; it closes on Esc, a second click on the field, or a press outside.
- **New**: Ctrl+K opens the panel from anywhere (to add to GV-76); the palette lists other subjects, rooms and Settings
  and filters as you type.
- **RS-18** collapse at 1024 px as above; **RS-20** spaces are glyph + word (word hidden at 1024 px), current marked by
  an ink underline and an accent dot, never a boxed button.
- **Header intro**: the top strip of the bar drags the window, under a 3 px resize edge.
- The header-mark rules of RS-53 are unchanged.
- **Companion** (added 2026-10-17, user): while Amber is off, an **Ask** button is the capsule's last
  segment, after settings, styled like the other segments; it opens Ask Amber
  ([companion](../../agent_wiki/specs/companion.md) CO-41). While Amber is on it is absent, and Amber
  hangs below the bar (CO-10, CO-11); the field's panel draws above Amber (CO-17). Ctrl+J stays Amber's
  key; Ctrl+K stays the panel's.
