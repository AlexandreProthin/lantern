# Backdrop — final design

Selected on 2026-10-08 by explicit user instruction in chat: “backdrop-drf-r005-03.html is the one to end the design
session make it final”. The last saved request (revision 6, pick r004-03) was consumed by round 5; no new request was
saved, and none is needed for finalization.

- Winner: **r005-03 — Calm orbits, amber only**.
- Final snapshot: [backdrop-fin-r005-03.html](final/backdrop-fin-r005-03.html), a byte-exact copy of
  [backdrop-drf-r005-03.html](draft/backdrop-drf-r005-03.html). Its experiment header remains as provenance.
- Shared files: [backdrop-data.js](backdrop-data.js) and [assets/ui-overlay.js](assets/ui-overlay.js) (the replica of
  the app's Welcome, Study and Gallery, mounted with `glass: true`). Both are loaded as `../…`, which resolves the same
  from `final/` as from `draft/`. The bottom pill (screen switcher, *Light a node*, *Preview ×8*) and the corner tag
  are prototype controls, not part of the design.
- What it is: one layer behind every space of the Learn room. Soft, far lights orbit slowly around a per-screen
  anchor, crisp motes drift upward and only show where light falls, and the UI's header, panel and cards are frosted
  glass so the lights pass behind them.

## Decisions and contributing ancestry

All rounds were `draft` (nothing frozen).

| Design | Parents | Contribution retained in the final |
| --- | --- | --- |
| r001-01 — Fog light | none | Large blurred light shapes drifting far back on long cycles; per-screen recomposition. Its grain was rejected in round 2. |
| r001-02 — Lantern dust | none | Motes at three depths that show only where light falls; the pointer's slow lantern pool; lit nodes reacting. Its haze/dust noise was rejected in round 2. |
| r002-01 — Clear lantern dust | none (fresh round, built from r001-02) | No grain, fewer motes, all crisp points; no bokeh. |
| r003-01 — Slow orbits | r002-01 | r001-01's light brought back as five blurred glows orbiting the screen's centre (52–120 s), replacing the spotlight beam. Motes catch their light. |
| r004-03 — Slow orbits, glass UI | r003-01 | Rendered under the UI; header, panel, cards and thumbnails as frosted glass. |
| r005-03 — Calm orbits, amber only | r004-03 | Texture layer removed; lit-node reaction calmed; teal companion replaced by room tokens. Full-resolution lights (fix below). |

Rejected along the way: the contour/lattice/astrolabe line (r001-03 → r002-02 → r003-04/05/06 → r004-04/05/06), the
veils (r002-03), visible light spheres and the orrery (r003-02, r003-03), orbits following focus (r004-02), solid UI
surfaces (r004-01), and the room-neutral-only palette (r005-02).

## Verbatim inputs

| Round | Saved prompt (picks, mode) |
| --- | --- |
| 1 | Add texture/depth to the background of Welcome, Graph view and Gallery. Empty canvas, no app elements. Shared base tuned per screen (Welcome/Graph/Gallery switcher). Very slow drift (30-90 s cycles) with subtle reactions: pointer, graph pan/zoom, learning events, screen changes. Round 1: 3 layered mixes of blurred light shapes, grain & atmosphere, dust/motes, subtle pattern. Palette: existing navy/amber tokens plus one muted cool companion. (none, combine) |
| 2 | I do not like the noisy/dust texture effect. Make it clear/clean. not sure yet but by preference order:r001-02, r001-03,r001-01 (none, fresh) |
| 3 | r002-01 but with the r001-01 background i prefer the idea of having far light emitting spheres orbitting arround instead of a spotlight / r002-02 is interesting (propose two alternative: one with the same pattern and one with a new geometric patter) / not r002-03 / i want the cristal clear feeling. keep the stars/particles hanging/moving arround it adds nice details. (r002-01, r002-02, branch) |
| 4 | For the next round render the ui over it so i can experience the full feeling. probably the last round. / r003-01 is fine / r003-04 is fine too / r003-04 but include the mesh deformation from r003-05 (r003-01, r003-04, branch) |
| 5 | r004-03 is the one, to refine. Too much hightlight (too distracting) on node being lit. Remove the texture too. In one variant strictly use the initial color palette no extra color or acccent color. (r004-03, branch) |

How round 5 was read: “texture” = the static ~1% anti-banding noise layer; “highlight” = the backdrop's reaction to a
lit node (bloom, sphere flare, motes pushed). The node's own glow belongs to the app and is unchanged. The round-1
“muted cool companion” (teal) was dropped in the final: r005-03 is amber light on navy only.

No type input was given: the UI replica uses the app's existing Segoe UI Variable stack (see the
[welcome RECIPE](../welcome/RECIPE.md)).

## Final palette

The Learn room palette (RS-31), unchanged. The backdrop uses these tokens:

| Role in the backdrop | Token | Value |
| --- | --- | --- |
| Base fill | --bg | #101827 |
| Main orbit light, mote warmth | --accent | #e8b66e |
| Small near light, lit-node pool | --node-lit | #ffe1aa |
| Wide warm light, pointer lantern | --glow-far (its rgb) | rgb(255,182,88) |
| Former teal light (warm brown) | --path-muted | #6f5c42 |
| Former deep-teal light (widest) | --line | #3b4558 |
| Cool motes (30%) | --ink-mute | #aeb3bf |

Values in the snapshot that are **not** tokens and must be mapped in the app (RS-32 forbids raw hex):

| Snapshot value | Used for | Map to |
| --- | --- | --- |
| #ffdca0, #ffe3b0, rgb(255,214,150) | warm motes and the near-mote halo sprite | `--node-lit` (#ffe1aa); visually indistinguishable |
| rgba(6,8,18,.4) | vignette edge | `color-mix(in srgb, black 40%, var(--bg))` or a new `--vignette` token |

Glass UI (from `ui-overlay.js`, `.lx.glass`): surface `color-mix(in srgb, var(--surface) 55%, transparent)`, hairline
`--ink-mute` at 16% alpha, `backdrop-filter: blur(20px) saturate(135%)`. Applies to header, side panel, gallery cards
and thumbnails.

## Final values

Lights (fractions of viewport width/height; `per` in seconds, negative = clockwise; `a` = strength). Halo gradient:
alpha `a` at the centre, `a/2` at 30%, 0 at the edge; composited with `screen` over `--bg`. No visible cores.

| Light | Token | glow | rx, ry | tilt | per | phase | depth | a |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | --accent | .30 | .20, .13 | .4 | 80 | 0.0 | .6 | .24 |
| 2 | --path-muted | .40 | .36, .22 | .3 | −96 | 2.2 | .35 | .20 |
| 3 | --line | .48 | .42, .30 | .2 | 120 | 4.0 | .2 | .30 |
| 4 | --node-lit | .11 | .11, .08 | .6 | −52 | 1.1 | .8 | .10 |
| 5 | --glow-far | .22 | .30, .26 | .5 | 70 | 3.3 | .5 | .10 |

A light swinging towards you (`z = sin θ · tilt`) grows by `1 + .35z` and brightens by `.75 + .25z`.

Per screen (orbit anchor cx, cy; stretch sx, sy; overall gain; share of motes shown; pointer lantern), eased over
~1.5 s on a screen change:

| Screen | cx, cy | sx, sy | gain | dust | lamp |
| --- | --- | --- | --- | --- | --- |
| Welcome | .5, .45 | 1.0, 1.0 | 1 | 1 | .8 |
| Graph | .5, .5 | 1.9, 1.7 | .55 | .5 | .4 |
| Gallery | .5, .06 | 1.4, .45 | .8 | .75 | .6 |

Motes: three depths, 70% warm / 30% cool, drifting up and swaying gently; visible only where light falls
(`alpha = base · (.3 + light) · twinkle · gain`, hidden below .012).

| Layer | count | size px | alpha | rise (screen heights/s) | depth |
| --- | --- | --- | --- | --- | --- |
| far | 80 | 0.6–1.0 | .30–.60 | 1/260 | .25 |
| mid | 34 | 1.1–1.6 | .45–.85 | 1/170 | .55 |
| near | 9 | 2.0–2.8 + soft halo (5× size, 35% alpha) | .55–.90 | 1/110 | 1.0 |

Reactions:

- **Pointer**: a lantern pool `--glow-far` at 4.5% × lamp, radius .2W, following the pointer with a ~1.4 s lag; the
  lights shift up to 3% × depth away from it.
- **Graph pan/zoom**: parallax of 8% (lights) and 25% (motes) of the pan × depth; zoom scaled at 30% / 40% × depth;
  eased (rate 2.2/s). R resets.
- **Lit node** (`lx:light`, the calm r005 values): envelope rises over 1.4 s (smoothstep), holds, fades over 3.8 s
  (5.4 s total); a `--node-lit` pool at 5% alpha, radius .07W → .11W; nearby lights brighten by at most 20%; motes
  within .18W pushed at most 6 px × depth. (r004-03 was 13% / up to .18W / 120% / 28 px.)
- **Reduced motion**: time stops (lights and motes frozen), screens snap to their preset, the pointer lantern jumps
  instead of easing, a lit-node pool shows for 2 s with no fade.

Rendering: lights at full resolution (`HAZE_DIV = 1`), motes at up to 1.5× device pixel ratio; a vignette
(`radial-gradient(ellipse 80% 75% at 50% 45%, transparent 55%, <vignette> 100%)`) on top. No noise/dither layer.

## Fix during review

2026-10-07, approved by the user and patched in place in r005-03: the lights were drawn at quarter resolution and the
upscaled dark gradients showed as a grid of ~4 px squares. They are now drawn at full resolution. Rendering only.
Without the removed dither layer, 8-bit banding in the dark gradients may show on some displays: if it does in the
app, prefer a higher-precision canvas or a GPU shader over bringing the noise back (the user rejected texture twice).

## Implementation notes

- **Integrated 2026-10-08.** RS-33 was amended by the user and RS-34 describes the backdrop; the code is
  `app/src/frame/backdrop.ts`. The app follows the notes below, plus: the lights' pan parallax is bounded to one
  width, a lit node's flare is capped at +20 %, and reduced motion is one still frame with no reactions.
- **Spec conflict (resolved 2026-10-08, see above): RS-33** says “no animation runs in the frame except hover/press
  feedback and the pulses of RS-25”. The backdrop animates continuously (very slowly). Either RS-33 is amended to
  allow the backdrop as a slow ambient layer under the reduced-motion rules (GV-100 to GV-103), or the backdrop runs
  only on demand. Not changed in the wiki: the user decides.
- **RS-32**: map the non-token values above; read every colour from the room tokens so another room re-tints the
  backdrop for free.
- One fixed, pointer-transparent canvas layer behind the shell, shared by Welcome, Study (graph) and Gallery; the
  screen change only eases the preset, never restarts the motion.
- Inputs the app must emit: the active screen, graph pan/zoom, pointer position, and a node lit (screen position).
- Cost: five full-screen radial gradients per frame plus up to 123 motes. Pause when the window is hidden, and
  consider capping at 30 fps; check that the glass `backdrop-filter` stays smooth on low-end GPUs.
