# Welcome context: final design

Selected on 2026-10-04 by explicit user instruction: “Final on welcome-context-mot-r004-01.html with the hint text
repositionning and resizing in a smooth but direct animation”, clarified as **on focus**. Saved request at that point:
revision 5 (picks r002-02, r003-03; motion, combine, empty prompt), consumed by round 4.

- Winner: **r004-01 — Ride, settle**.
- Final snapshot: [welcome-context-fin-r004-01.html](final/welcome-context-fin-r004-01.html). Unlike the `welcome`
  final, **it is not an exact copy** of [welcome-context-mot-r004-01.html](motion/welcome-context-mot-r004-01.html):
  it adds the hint motion the user asked for when choosing it (see *Final amendment*). Nothing else differs.
- Shared content: [welcome-context-data.json](welcome-context-data.json), loaded through
  [welcome-context-data.js](welcome-context-data.js); the relative path resolves from `final/`. The prototype bar
  (State, Slow ×4, Play, Fill direction, next Suggest fails) is not part of the design.
- Base: the shipped v0.1.0 Welcome (`app/src/rooms/learn/Welcome.svelte`, itself the final of
  [../welcome/RECIPE.md](../welcome/RECIPE.md)). Its layout, type, palette, header, tone and model pickers, Suggest,
  chips and recents shelf are unchanged; this recipe only adds the direction and the capsule.
- Behaviour and content are fixed by the specs: [welcome-gallery](../../agent_wiki/specs/welcome-gallery.md) WG-1,
  WG-3, WG-8 to WG-11; the prompt side is [context-assembly](../../agent_wiki/specs/context-assembly.md) CA-37 and
  [tutor-protocol](../../agent_wiki/specs/tutor-protocol.md) TP-13.

## Decisions and contributing ancestry

| Design | Phase | Parents | Contribution retained in the final |
| --- | --- | --- | --- |
| r001-01/02/03 | wireframe | none | Explored always-visible second line, an *Add direction* disclosure, and one field with Shift+Enter. None picked; the user kept the **Shift+Enter** mechanism of r001-03 for every later round. |
| r002-02 — Capsule | wireframe | none | The user's sketch (`refs/user-sketch.png`): while the field is active it becomes a **capsule** with *Carry the lantern in* docked at its right end; **Shift+Enter** grows it into a two-part card, subject above a hairline, direction below, button docked bottom right. The direction is the same object as the subject, so it reads as belonging to it. (r002-01 *Second underline* and r002-03 *Folding note* not kept.) |
| r003-03 — Ride the edge | motion | r002-02 | The button exists **only while the subject or direction has the cursor** (user brief). On Shift+Enter it is pinned to the capsule's corner and **rides the edge** as the card grows; no travel. The hairline draws in from the left. On focus it slides out from behind the capsule's right edge. (r003-01 *Fold and carry*, r003-02 *Ember carry* not kept.) |
| r004-01 — Ride, settle | motion | r002-02, r003-03 | r003-03 **without its bounce**: no elastic overshoot on the card, no squash on landing, both ways. Plain ease-out. (r004-02 *glide* 480 ms ease-in-out and r004-03 *snap* 240 ms not kept.) |

## Verbatim inputs

| Round | Saved prompt | Chat |
| --- | --- | --- |
| 1 (wireframe, combine) | Welcome: an optional way to give extra context about the graph direction or the initial hook, beside the subject field. Default behaviour unchanged (type a title, press Enter). Start from the final welcome recipe (agent_design/welcome/RECIPE.md) and the user's sketch in refs/. Explore structurally different mechanisms. | Brief written by the agent from the v0.1.1 plan (F5); the user said “go”. |
| 2 (wireframe, fresh) | Rule for every round to come, alway true: keep the current app v0.1.0 welcome design as a base. We will end up very close. I like the shift + enter mecanics to trigger the optionnal text filed | — |
| 3 (motion, combine) | "Carry the lantern in" button — only shows up when text field cursor became/is active — on shift + enter it relocate in a cool travel animation (make one with reduce/collapse -> travel -> grow/settle, some morphing maybe. for the other two you propose the animation) | — |
| 4 (motion, combine) | *(empty)* | “r003-03 is the one, just remove the starting/ending bounce animation. 500 characters is right. the where should it start, or head? (optional) is fine” |
| final | — | “Final on welcome-context-mot-r004-01.html with the hint text repositionning and resizing in a smooth but direct animation”; hint moment: **On focus**. “direction feed every later generation”, “keep chips filling only the title”; direction editable later **in the subject menu**; sent as **a context block**. |

Round 2's rule overrode the wireframe phase's black-and-white convention: rounds 2 to 4 are drawn in the v0.1.0
look. No type or colour inputs were given; none were changed.

## Content and behaviour (agreed)

- **Placeholder** of the direction: *Where should it start, or head? (optional)*.
- **Limit**: 500 characters. From 400 a counter `n / 500` shows in the card's lower left; over 500 it turns
  `--error-ink`, the button is disabled and the line under the hint reads *The direction is n characters over the
  500 limit.*
- **Hint** (the example line) gains a second sentence: *For example, ocean tides, jazz harmony, or how cities grow.
  **Shift+Enter** adds a direction.* (`kbd` in `--ink-mute`).
- **Keys**: Enter submits from either part. Shift+Enter in the subject opens the direction (or moves to it); in the
  direction it is a new line. Backspace in an empty direction, or Esc in the direction, clears and closes it and
  returns to the subject. Arrow Down from the subject goes to an open direction; Arrow Up at the very start of the
  direction goes back. Esc in the subject still clears the subject (WG-8).
- **Button**: visible only while focus is in the subject, the direction or the button itself. Leaving keeps the
  capsule while the subject or direction holds text; a direction that is empty when focus leaves is closed.
- **Blank subject**: the button stays disabled whatever the direction holds; the line under the hint reads *Add a
  subject to carry the lantern in; the direction alone is not enough.*
- **Suggestion chips** fill the subject only (WG-4 unchanged); the direction is never filled by the app.
- The direction is stored on the new subject and **feeds every later generation**; it can be changed in the subject
  menu (specs above).

## Form (frozen from r002-02)

| State | Look |
| --- | --- |
| Rest (no focus, empty subject) | v0.1.0 exactly: the 38 px Display 350 subject centred on its amber underline (`--accent` 45% over `--line`), no button. |
| Capsule (focus, or a subject) | 1 px border `--accent` 60% over `--line`, radius 32 px, fill `--bg` at 70%, padding 4 / 6 / 4 / 28 px. Subject 22 px Text 400, left-aligned, 8 px vertical padding. The button (v0.1.0 primary, 12 × 28 px padding, no outer glow inside the capsule) docks at the right end, 10 px from the text. |
| Two-part card (direction open) | Radius 24 px, padding 8 / 8 / 8 / 24 px. Subject row; a 1 px `--line` hairline (16 px short of the right edge); the direction textarea, 15 px, line-height 1.5, auto-growing, no resize handle; a tail row with the counter at left and the docked button at right. |
| Hint | Rest: centred, 12 px Small. Capsule and card: left-aligned under the subject text (29 px inset in the capsule, 25 px in the card), 11 px. |

The radial `--glow-far` behind the field is unchanged; it now sits behind the capsule edge (watch B6 in the
[v0.1.1 plan](../../agent_wiki/plans/v0-1-1.md) when implementing).

## Final motion

One easing for the whole component: **ease-out `cubic-bezier(.2,.8,.2,1)`**, no overshoot anywhere.

- **Card** (rest ↔ capsule ↔ two-part card, and the tail growing or shrinking when the button leaves or returns):
  height, padding, radius, border colours and fill animate together over **380 ms**. The subject's size and padding
  animate over 260 ms with a brief opacity dip (to 15% at 35%) that hides the centre-to-left realignment. The dock
  (the space the button takes in the subject row) opens or closes over 240 ms.
- **Shift+Enter**: the card grows over 380 ms; the button is pinned to the card's bottom-right corner and travels
  with it, stopping dead at its dock. The hairline draws left to right (scaleX 0 → 1, 290 ms, 70 ms delay); the
  direction fades and drops in (opacity 0 → 1, translateY −6 px → 0, 240 ms, 125 ms delay). **Closing**: the direction
  fades out (110 ms), then the card shrinks over 380 ms with the button riding the corner back up.
- **Button appears** (focus enters): it slides out from behind the capsule's right edge, `clip-path: inset(0 0 0 100%
  round 999px)` → `inset(0)` with `translateX(16px)` → 0, **240 ms**. **Leaves** (focus out): the reverse, 170 ms,
  `cubic-bezier(.4,0,1,1)`.
- **Hint** *(final amendment)*: when the field turns into the capsule or back, the hint glides to its new place and
  size: a FLIP on its text box, `translateX(dx) scale(old font / new font)` → none from the top-left corner, over the
  card's 380 ms and easing; its vertical place follows the card's height, so both move as one. Where the hint wraps
  on a narrow window only the scale and inset move.
- **Submit**: unchanged from v0.1.0 (a light runs from the subject to the button, handoff 260 ms after arrival).
- **Timer-driven**: every state change completes on timers, never on animation `finished` promises or frames, so a
  hidden or throttled window cannot leave the card half-open (same rule as the Welcome recipe's handoff).
- **Reduced motion**: every change is instant; behaviour unchanged.

## Implementation notes for v0.1.1

- Keep one persistent element for the button and move it between the two docks; rebuilding the DOM on focus changes
  breaks both the motion and clicks on chips (a click lands on a node that was just replaced).
- Measure targets in the final layout before starting animations; when the direction grows while the card is still
  animating, shift the button by the textarea's height change instead of re-measuring (a re-measure mid-animation
  parks the button half-way: bug found and fixed in r003).
- The direction field shares the subject's `maxlength` logic only for the title (120); the direction is limited by
  validation (counter and disabled button), not by `maxlength`, so a pasted text over the limit is visible and
  editable rather than silently cut.
