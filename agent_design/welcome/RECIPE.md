# Welcome — final design

Selected on 2026-10-02 by explicit user instruction: “last pick: r005-03 it is the final design”
(saved request revision 9: picks r002-01, r001-01, r003-01, r004-01, r005-03; prompt “next round is Final”).

- Winner: **r005-03 — Embers**.
- Final snapshot: [welcome-fin-r005-03.html](final/welcome-fin-r005-03.html), an exact copy of
  [welcome-mot-r005-03.html](motion/welcome-mot-r005-03.html). Its experiment header remains as provenance.
- Shared content: [welcome-data.json](welcome-data.json), loaded through [welcome-data.js](welcome-data.js); the
  relative path resolves from `final/`. The *State* selector (Normal, One subject, First run, CLI not ready, Library
  unavailable) and the *next Suggest fails* toggle are prototype controls, not part of the design.
- Behaviour and content are fixed by the specs: [welcome-gallery](../../agent_wiki/specs/welcome-gallery.md) WG-1 to
  WG-14 and [rooms-spaces](../../agent_wiki/specs/rooms-spaces.md) RS-12/RS-20. This recipe fixes the look.

## Decisions and contributing ancestry

| Design | Phase | Parents | Contribution retained in the final |
| --- | --- | --- | --- |
| r001-01 — Threshold | wireframe | none | One centred column: the subject field, then tone and Suggest on one line, the suggestion chips, three equal recent cards on a shelf, *Browse all n* closing it. The alternatives (r001-02 two doors, r001-03 sentence and spotlight) were not kept. |
| r002-01 — Lantern hall | form | r001-01 | Sparse, centred, extreme scale contrast: the field alone at the centre as a light underline, the primary button centred under it, tone pills, model and Suggest as small quiet controls, recents far below and dimmed until hovered. **Adds the model picker beside the tone** (user request). |
| r003-01 — Native | type | r002-01, r001-01 | Segoe UI Variable in its three optical sizes (the PoC's own face); sentence-case labels; no mono, tabular figures for counts. |
| r004-01 — Lit question | color | r002-01, r001-01, r003-01 | Binding Learn palette with the light on the start: glow behind the field, amber underline and caret, glowing primary; muted tone/model/Suggest; recents dim until hovered. **Header without the Study icon** (user request). |
| r005-03 — Embers | motion | r002-01, r001-01, r003-01, r004-01 | The learning node's motion language (see below). |

Spec changes made during the rounds, at the user's request, directly in the wiki:

- **WG-1/WG-2/WG-3**: Welcome has a **model picker** beside the tone (aliases opus, sonnet, haiku, or a free-text id).
  It starts on the Settings default model on every arrival; the choice applies to the new subject only and never
  writes Settings. Effort stays the Settings default.
- **RS-20 (with RS-11, RS-22, WG-12)**: on **Welcome only**, the header has no Study icon (Welcome and Gallery);
  every other space keeps all three. Ctrl+2 still works on Welcome.

## Verbatim inputs

| Round | Saved prompt | Chat clarification |
| --- | --- | --- |
| 1 (wireframe) | Welcome space of the Learn room (spec welcome-gallery WG-1 to WG-14, header RS-12/RS-20). Content and behaviour are fixed by the spec; explore the structure: how the subject field, Suggest 3, tone picker, 3 recent cards and Browse all are arranged and navigated, plus the first-run, CLI-not-ready and library-unavailable states. | — (brief written by the agent from the spec; the user gave none) |
| 2 (form) | r001-01 only addition: add a model selector next to the tone then wireframe is done. include it in the next round | — |
| 3 (type) | spec WG-2 says the subject model comes from Settings. Adjust it so we can override the default model (defined in settings) from the welcome pannel for a new session default. | Parent r002-01 only; model choice is “This subject only”; edit WG-2 directly; type: “you propose 3 but stay coherent with the poc and app spirit” |
| 4 (color) | The study (ctrl + 2) is not needed at the top (i forgot to tell in previous round) remove it for the next ones | “only on welcome and update the spec” |
| 5 (motion) | *(empty)* | — |

No type or colour values were supplied. Type was the agent's proposal; colour is the binding Learn palette of
[rooms-spaces](../../agent_wiki/specs/rooms-spaces.md) RS-31, so the colour round varied only where the light falls.

## Final type tokens

| Token | Value |
| --- | --- |
| --font-display | 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif |
| --font-body | 'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif |
| --font-small (labels, example line) | 'Segoe UI Variable Small', 'Segoe UI', system-ui, sans-serif |
| --font-mono | none (counts use `font-variant-numeric: tabular-nums`) |
| --step--2 … --step-6 | 11, 12, 14, 16, 20, 24, 30, 38, 46 px |
| --tracking-tight / -normal / -wide | -.01em / 0 / .01em |
| --leading-tight / -normal / -loose | 1.25 / 1.5 / 1.7 |
| weights | display 350 (semilight), titles / strong / labels 600 |
| case | sentence case everywhere, no tracked capitals |

Roles: the question field is `--step-5` (38 px) in Display 350; card titles `--step-1` (16 px) 600; body and buttons
`--step-0` (14 px); controls, meta and the example line `--step--1` (12 px); labels `--step--2` (11 px) 600.

## Final palette tokens

The Learn room palette, unchanged (RS-31), plus the error token of RS-32:

| Token | Value |
| --- | --- |
| --bg | #101827 |
| --surface | #172132 |
| --surface-2 | #302b2a |
| --ink | #f3e9dc |
| --ink-mute | #aeb3bf |
| --line | #3b4558 |
| --accent | #e8b66e |
| --accent-ink | #211b14 |
| --focus | #ffe0ab |
| --node-open | #969ca7 |
| --node-lit | #ffe1aa |
| --node-understood | #e8b66e |
| --glow-near | rgba(255,199,118,.34) |
| --glow-far | rgba(255,182,88,.15) |
| --path-muted | #6f5c42 |
| --error / error text | #d86a5a / #f0a598 |

Two helpers are mixes of tokens, not new colours: `--ink-faint = color-mix(in srgb, --ink-mute 62%, --bg)` and
`--line-strong = color-mix(in srgb, --line 65%, --ink-mute)`.

Where the light falls (r004-01): a radial `--glow-far` ellipse (560 × 240 px) behind the field; the field underline is
`--accent` at 45% over `--line`, full `--accent` on focus with a soft `--glow-near` shadow, caret `--accent`; the enabled
primary button is `--accent` on `--accent-ink` with a `--glow-far` halo, `--focus` on hover; the selected tone is
`--node-lit` text on `--surface-2`; tone, model and Suggest are `--ink-mute`, Suggest turns `--accent` on hover; the room
chip and the active space icon are `--accent`; recent cards sit at 70% opacity, full on hover, where the thumbnail gains a
`--glow-far` drop-shadow. Thumbnails (WG-40): edges `--path-muted`, open = `--bg` fill with a dotted `--node-open` ring,
lit = `--surface-2` fill with a `--node-lit` ring, understood = solid `--node-understood`.

## Final motion

The learning node's constants ([learningnode RECIPE](../learningnode/RECIPE.md)), shared so Welcome and Study speak
one language: travel at 1250 px/s with each run bounded to 160–650 ms; a comet trail emitted every 22 ms (up to 34
particles, lateral drift up to 26 px/s); embers live 610–690 ms; a fan is 16 embers over 1.4π rad at 28–66 px/s.
Embers are cream (`--node-lit`) in their first 40% of life, then amber (`--accent`); the light dot is `--node-lit`
with an `--accent` blur of 12 px. All effects are drawn on one fixed, pointer-transparent canvas layer.

- **Arrival**: the field's underline draws in (650 ms), then one light travels along it from the left edge to the
  centre and fans out. Once per page load.
- **Submit**: a light runs from the field's underline into *Carry the lantern in* and bursts; the handoff to Study
  follows 260 ms after arrival. **The handoff is timer-driven** (run time + 40 ms), never waiting on animation
  frames, so a hidden or throttled window cannot block it (a bug found and fixed in r005-03).
- **Suggest thinking**: embers rise from the *Suggest 3 subjects* link every 90 ms while busy; when the chips arrive, a
  fan of 10 rises from the first chip, and the chips fade in 50 ms apart (200 ms each).
- **Card hover**: a light runs through the card's thumbnail, from the root to the last drawn node, once per entry.
- **Everything else**: colour, opacity and glow changes take 150–250 ms ease-out; the handoff fades in over 180 ms.
- **Reduced motion**: the canvas is hidden and every animation and transition is off; behaviour is unchanged.

RS-33 asks for a calm frame. These effects live in the Welcome space, run once per user action, and never loop
except the Suggest embers while a call is running.

## Implementation notes for M4

- Read every colour from the room tokens; the helpers above are the only derived values.
- The header on Welcome renders Welcome and Gallery icons only (amended RS-20).
- The model picker is a select with *Opus (default)*-style labelling of whichever alias is the Settings default, and
  *Other id…* revealing a validated free-text field (`[A-Za-z0-9._:-]`, 1–100 characters).
- Share the ember and travel code with the Study graph's motion module rather than copying it (one set of constants).
