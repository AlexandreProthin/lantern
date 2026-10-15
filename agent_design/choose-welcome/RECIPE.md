# Choose welcome — final design

Selected on 2026-10-15 by explicit user instruction in chat: "r003-01 is the final one". Saved request at that point:
revision 6 (picks r001-01, r001-02, r002-01, r003-01; motion, combine; prompt unchanged from revision 5). Not consumed
by a round; finalization needs none.

- Winner: **r003-01 — Learn's embers, teal** (motion), on r002-01 (colour), r001-01 + r001-02 (structure). Form and
  type were not explored in rounds: they are Learn's Welcome and the Choose components' (user request, round 2).
- Final snapshot: [choose-welcome-fin-r003-01.html](final/choose-welcome-fin-r003-01.html), a byte-exact copy of
  [choose-welcome-mot-r003-01.html](motion/choose-welcome-mot-r003-01.html). Its experiment header stays as provenance.
- Shared files, loaded as `../…` (the same from `final/` as from `motion/`): [choose-welcome-data.js](choose-welcome-data.js)
  (subjects, settings, copy, scenarios), [assets/welcome-kit.js](assets/welcome-kit.js) (frame, header, scenarios,
  limits, submit), [assets/color-base.js](assets/color-base.js) (tokens, type, form, field and card markup),
  [assets/welcome-motion.js](assets/welcome-motion.js) (embers and capsule, ported from the app),
  [assets/backdrop.js](assets/backdrop.js) (a copy of choose-gallery's final backdrop).
- Prototype controls, not part of the design: the top bar (*State*, *Replay arrival*, *Reduce motion*). The toasts
  stand in for the real actions (submit goes to Survey, a card opens its subject, *Browse all* goes to Gallery, the
  links go to Settings).

## What it is

Learn's Welcome, for choosing. Content and behaviour are Learn's (welcome-gallery WG-1 to WG-14) except where this
list says otherwise.

1. **The question field**: *What do you want to choose?*, focused on arrival. While active it is Learn's **capsule**
   with *Carry the lantern in* docked at its right end, shown only while focus is in the field (WG-10).
2. **The needs** (CR-13, the direction of WG-9 for this room): **Shift+Enter** opens a second part of the same capsule,
   placeholder *Budget, who it's for, what you already know… (optional)*. Under it, **need starters**: *Add* + *Budget
   (€)*, *Who it's for*, *What for*, *Where it goes*, *Already have*, *Must avoid*. A starter inserts only its label at
   the cursor (*budget about | €*, *it's for |*, *I want to use it to |*, *it will be in |*, *I already have |*, *I
   don't want |*), adding *, * before it when needed; the user writes the answer, the app never does (as WG-11). The
   currency symbol comes from Settings → Choose room (CR-90). Keys, the 500-character limit, the counter from 400, the
   over-limit and blank-subject messages are Learn's (WG-8 to WG-10), worded for needs: *The needs are n characters
   over the 500 limit.*, *Add what you want to choose; the needs alone are not enough.* Tab order: subject, needs,
   starters, button.
3. **Example line**: *For example, a 3D printer, a family car, or headphones for flights. **Shift+Enter** adds your
   budget and needs.*
4. **Tone and model pickers**, as Learn's (WG-1, WG-2), with the Choose room's default tone (CR-81, CR-90).
5. **Locale line** (new): *Prices for France in € · research on the web · change*, or *… · web off, from the model's
   knowledge* when *Use the web* is off (CR-44); *change* opens Settings → Choose room.
6. **Continue a choice**: the 3 most recent Choose subjects (WG-6) as **choose-gallery's resting card**, so Welcome and
   Gallery cards are one family: status band (*exploring / decided / bought* and *opened <relative>*, exact time in the
   tooltip), the title on one line (ellipsis, full title on hover), the steps bar (*Needs* answered/total, *Criteria*
   ranked/total, *Shortlist* count, full at 2, *Pick* chosen / bought / —), the pick line (*Chose / Bought* + product +
   price; *No pick yet* + *n missing* with the list in the tooltip; or *Ready · the room can recommend*), and a footer
   with the CR-25 stats and Learn's *Continue* link. Click, Enter or *Continue* opens the subject in Survey.
7. ***Browse all n***: opens Gallery (Ctrl+4); hidden with no subjects.

Not kept from Learn: **Suggest 3 subjects** (suggesting things to buy did not fit; omitted since round 1 without
objection). Kept from Learn: the button label *Carry the lantern in*.

States:
- **First run**: the lede *Bring something you want to choose and know nothing about. The room shows what matters,
  asks what you need, and compares real products with their sources.*, no cards, no *Browse all*; Survey, Compare and
  Gallery icons disabled (RS-11).
- **CLI not ready**: the field stays editable, the button is disabled, *The Claude Code CLI is not ready. Fix it in
  Settings → Provider.* with a link; cards still open (WG-13).
- **Library unavailable**: field disabled, the message in place of the cards (WG-14).
- **Header**: RS-12 / RS-20 with Choose's four spaces (CR-11): Welcome, Survey, Compare, Gallery (Ctrl+1 to Ctrl+4).

## Decisions and ancestry

| Round | Design | Parents | Decision |
| --- | --- | --- | --- |
| 1 wireframe | r001-01 Threshold, tuned | none | **Kept**: Learn's column, capsule and Shift+Enter, locale line, shelf of three, Browse all. |
| 1 wireframe | r001-02 Needs on the table | none | **Kept**: the needs line and the need starters, now behind Shift+Enter. Not kept: always-visible needs, the row list. |
| 1 wireframe | r001-03 Two beats, next steps | none | Not kept. |
| 2 colour | r002-01 Lit question | r001-01, r001-02 | **Kept**. Not kept: r002-02 Teal needs, r002-03 Glass lamp. |
| 3 motion | r003-01 Learn's embers, teal | r001-01, r001-02, r002-01 | **Final.** One proposal by request (tool option `single`). |

## Verbatim inputs

| Round | Saved request (revision, picks, phase, mode, prompt) |
| --- | --- |
| 1 | rev 1, none, wireframe, combine: *Welcome space of the Choose room (choose-room CR-11, CR-12, CR-13, CR-24, CR-90; header RS-12/RS-20). "What do you want to choose?" with the optional direction field (e.g. "budget about 500 €, I want to print figurines for my kids"), the 3 most recent Choose subjects with their status (exploring / decided / bought) to continue, and the way to Gallery. Hard cases: first run with no subjects, a subject that's decided, one that's bought, long subject names, CLI not ready. Explore what is specific to choosing compared with Learn (e.g. how the direction field invites needs and budget), but don't break the shared header/space structure (RS-12, RS-20). Stay consistent with Learn's Welcome (welcome and welcome-context recipes) and the choose-palette recipe.* (written by the agent from the user's chat brief) |
| 2 | rev 3, r001-01 r001-02, color, combine: *r001-01 but shit + enter shows r001-02 (with the preset options to choose/clic from). Then jump to the color round and pick the missing choices from other choose room design round to keep it uniform. if in doute of anything ask me. To keep the lantern feeling over the room stay coherent with the already designed learn room especially for the welcome view.* |
| 3 | rev 5, + r002-01, motion, combine: *as close as learn room. Only one proposition for the next round* |
| final | rev 6, + r003-01; chat: *r003-01 is the final one* |

How they were read: round 2's structural change was applied once as the frozen base of the colour round; "the missing
choices" (form, type) were taken from Learn's Welcome (welcome, welcome-context recipes) and the finished Choose
components (choose-gallery's card, choose-board's type, which is Learn's); no colour input was given, so the palette is
CR-70 and the round varied where the teal falls. Round 3: Learn's shipped motion, unchanged in constants; the tool
requires three proposals per round, the user chose "Change the tool", and a single-proposal option already existed.

## Form (frozen in color-base.js)

Learn's Welcome as shipped (welcome-context recipe, *Form*):
- Column 760 px, top padding 18vh (24vh on first run), 20 px gaps; lede 16 / 1.7 centred.
- Rest: the question 38 px Display 350, centred, on its underline. Capsule: radius 32, padding 4 / 6 / 4 / 28, subject
  22 px Text 400 left. Two-part card: radius 24, padding 8 / 8 / 8 / 24; a 1 px hairline 16 px short of the right; the
  needs 15 / 1.5, auto-growing; the starters row (6 px gaps, pills 3 × 10 px, 12 px), then the tail (counter left,
  button right). Button 12 × 28 px, 14 px 600, fully rounded.
- Example line: rest centred 12 px Small; capsule and card left-aligned, 11 px, inset 29 / 25 px.
- Pickers and the locale line centred under it; the shelf 15vh below, **920 px wide** (wider than the column: the
  Choose card holds more than Learn's), 3 columns, 24 px gaps; one column under 760 px.
- Card: choose-gallery's resting card (12 px radius, glass, 20 px inner margins, band 8 × 20 px, steps four columns
  8 px apart with 4 px bars), footer over a hairline.

## Type

Learn's Welcome type, which is also choose-board's and choose-gallery's: `--font-display` Segoe UI Variable Display,
`--font-text` Segoe UI Variable Text, `--font-small` Segoe UI Variable Small, each falling back to `'Segoe UI',
system-ui, sans-serif`; sentence case, no mono, tabular figures for counts. Question 38 px Display 350 (−.01em);
capsule subject 22 px Text 400; needs 15 px; buttons 14 px 600; controls, example, starters 12 px; labels, locale,
counter, band 11 px. Card type is choose-gallery's (pick line Display 600 18 px, title Text 13 px, steps and stats
Small 11 px).

## Colour (r002-01, Choose palette tokens only)

Tokens: the accepted Choose palette (CR-70), binding, plus the helpers `--glass`, `--glass-line`, `--glass-blur`,
`--ink-faint`, `--line-strong` (choose-board, choose-gallery). Glass over the backdrop (RS-34, `welcome` screen).

| Element | Token |
| --- | --- |
| Behind the field | radial `--glow-far` ellipse, 560 × 240 px |
| Underline at rest | `--accent` 45% over `--line`; on focus `--accent` |
| Capsule / card edge, fill | `--accent` 60% over `--line`; `--bg` at 70% |
| Caret | `--accent` |
| Hairline | `--line` |
| *Carry the lantern in* | `--accent` fill, `--accent-ink` text, `--focus` on hover; disabled `--surface-2`, `--ink-faint`, `--line` |
| Selected tone | `--node-lit` on `--surface-2`; others `--ink-mute` |
| Need starters | no fill, dashed `--line`, `--ink-mute`; hover `--accent` border and text |
| Example, locale, labels | `--ink-faint` (keys `--ink-mute`) |
| Over limit | `--error-ink` |
| Header | glass; mark, *Choose* and the current space `--accent` |
| Cards | choose-gallery's r003-01 colours (bands: exploring `--accent` text, ready + `--accent` 18%, decided `--focus` on `--surface-2`, bought `--accent-ink` on `--accent`; steps `--accent` 55% / full `--accent`; hover edge `--accent` 35%), **at 70% opacity until hovered or focused**, as Learn's shelf |
| Focus ring | 2 px `--focus` |

## Motion (r003-01, Learn's, unchanged constants)

A port of the shipped app (`app/src/rooms/learn/embers.ts`, `capsule.ts`, `Welcome.svelte`). Ember colours are read
from the tokens: cream `--node-lit` for the first 40% of life, then `--accent`; the light dot `--node-lit` with an
`--accent` blur of 12 px. One fixed, pointer-transparent canvas.

- **Ember constants**: travel 1250 px/s, each run 160–650 ms; trail emitted every 22 ms, at most 34 particles, drift
  26 px/s; life 610–690 ms; a fan is 16 embers over 1.4π rad at 28–66 px/s.
- **Arrival** (once per load): the underline draws in, `scaleX` 0 → 1, 650 ms ease-out; then a light runs along the
  field's bottom from the left edge to the centre and fans out. The field is focused on arrival (as the app).
- **Capsule**, easing `cubic-bezier(.2,.8,.2,1)`, no overshoot: shape (height, padding, radius, edge, fill) 380 ms; the
  subject's size with an opacity dip to 15% at 35%, 260 ms; the dock 240 ms. Button appears: `clip-path` slide from
  behind the right edge with `translateX(16px)` → 0, 240 ms; leaves: the reverse, 168 ms, `cubic-bezier(.4,0,1,1)`.
  Shift+Enter: the button rides the card's corner to its dock (380 ms); the hairline draws in (`scaleX`, 289 ms after
  72 ms); the needs fade and drop 6 px (240 ms after 125 ms); closing fades the needs (110 ms) before the card shrinks.
  The example line glides to its place and size with the card (FLIP, 380 ms).
- **Need starters** (Choose): appear like Learn's suggestion chips, `opacity 0, translateY(5px)` → none, 200 ms each,
  50 ms apart, starting with the needs (125 ms).
- **Card hover** (Choose): once per entry, a light runs along the steps bar from its left end to the end of the last
  filled bar (Learn: through the graph thumbnail). No light on an empty bar.
- **Submit**: a light runs from the centre of the field's bottom to the button; the handoff to Survey follows 260 ms
  after it arrives, **timer-driven**.
- **Everything else**: colour, opacity, shadow and border changes 180 ms ease-out.
- **Reduced motion** (OS setting or Appearance → Always reduce): the canvas is hidden, every animation and transition
  is off; behaviour is unchanged.

## For the implementation

- **Reuse Learn's code**: the Choose Welcome should share `embers.ts` and `capsule.ts` with Learn rather than copy them;
  the only additions are the starters row inside `.lower` and the steps-bar hover. The starters live inside the
  capsule, so focus moving to a starter must count as "in the field" (the button stays; the needs stay open).
- **B6**: r002-01 keeps a focus `box-shadow` under the rest underline; the app removed it from Learn's field (its
  blurred rectangle showed the field edges over the glow). Follow the app: no focus box-shadow.
- **Cards**: reuse choose-gallery's card component (band, steps, pick line) with a *Continue* footer; data comes from
  the summary cache as in Gallery.
- **Strings** to add: the question, the needs placeholder, the starter labels and inserts, the example line, the two
  messages, the locale line (both variants), the lede, *Continue a choice*.
- **Spec**: [choose-room](../../agent_wiki/specs/choose-room.md) CR-12 and CR-13 record this design.
