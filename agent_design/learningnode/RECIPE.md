# Learning Node — final design

Selected on 2026-09-30 by explicit user instruction: “r008-02 is the final design”.

- Winner: **r008-02 — Forward embers**, including the requested round 8 revision.
- Final snapshot: [learningnode-fin-r008-02.html](final/learningnode-fin-r008-02.html).
- Source: [learningnode-mot-r008-02.html](motion/learningnode-mot-r008-02.html).
- The snapshot is an exact copy of the selected source. Its original experiment header remains as provenance.
- Shared content: [learningnode-data.json](learningnode-data.json), loaded through [learningnode-data.js](learningnode-data.js). The relative script path resolves from the final folder.

## Decisions and contributing ancestry

| Design | Parents | Contribution retained in the final |
| --- | --- | --- |
| r002-01 — Quiet map | None (fresh start) | Circle-only nodes with internal status glyphs and titles as the only node text. Selecting a node highlights its ancestor route while all nodes stay in place. |
| r004-01 — Amber lantern | r002-01 | Warm navy background, amber accent paths, neutral dotted open circles and warm lit glow. |
| r005-02 — Trace the route | r002-01, r004-01 | Outward route choreography. Its line-drawing effect was subsequently replaced by the traveling light dot. |
| r006-03 — Junction relay | r002-01, r004-01, r005-02 | Light travels only along newly highlighted edges, with ordered handoffs at junctions. |
| r007-01 — Quick spark | r002-01, r004-01, r005-02, r006-03 | Faster travel, a passing node glow, and a restrained comet trail. |
| r008-03 — Scattered embers | r002-01, r004-01, r005-02, r006-03, r007-01 | Denser scattered particles lasting 610–690 ms; solid amber understood circles with dark checkmarks. This sibling became the explicit source of the revised r008-02. |
| r008-02 — Forward embers (revised) | Registered: r002-01, r004-01, r005-02, r006-03, r007-01; additional source: r008-03 | Keeps Scattered embers intact and adds a directional fan of 16 particles emitted once at each traversed node. |

All registered ancestry is listed above, including merged parents. The additional r008-03 contribution comes from the explicit chat amendment and is recorded here rather than rewriting the historical parent list. Round 1 and the round 3 form alternatives are not ancestors of the winner.

## Original type and color inputs

No separate type phase was selected. The original system-ui/sans-serif face, 13 px node titles, 400 weight and 1.5 line height remain. Circles measure 44 px on desktop and 38 px at widths up to 600 px; the mobile layout places titles beside indented circles.

The color brief was interpreted as a vibe with specific state treatment. Verbatim saved input (round 4, revision 5):

```text
background night blue, deep marine but warm.
node: warm light, glow when lit, neutral dotted outline when open, nice accent
path: accent colornot glowing
```

Verbatim subsequent chat clarification:

```text
palette of Amber lantern
```

## Final palette tokens

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

## Final motion and state behavior

- Selection highlights a route independently of learning state (`open`, `lit`, `understood`). It never changes the shared node data.
- A light dot travels outward along only newly highlighted edges. Initial display, repeated selection and return to an already highlighted ancestor do not replay the effect.
- Travel uses 1250 px/s with each edge duration bounded to 160–650 ms, linear progress and a 15 ms junction pause. Passing glow lasts 180 ms.
- The comet emits at a minimum 22 ms interval, with up to 34 live trail particles and lateral drift coefficient 26. Particles last 610–690 ms.
- Each crossed node emits one fan of 16 embers, spanning 1.4π radians around the travel direction. Emission begins at the circle rim; speeds range from 28–66 px/s. Junctions emit once per traversal, and the destination also emits on arrival. Node particles have a separate budget so they do not reduce the traveling trail.
- Understood nodes are filled with `--node-understood`, with `--accent-ink` checkmarks. Open nodes retain dotted outlines; lit nodes retain their static warm glow.
- Reduced motion disables travel, particles and passing glow. Navigation, page visibility changes and reduced-motion changes cancel transient animation; remaining particles otherwise drain naturally after arrival.

Verbatim round 8 saved refinement:

```text
a bit more particles, .5 sec longer lifespan.
refinement (not a motion step but make an exception) understood node are filled
```

The subsequent explicit chat amendment kept r008-03 unchanged and rebuilt r008-01/r008-02 from it with node emissions when traversed by the dot. The user then selected revised r008-02 as the final design.

## Verification

The revised source passed JavaScript syntax checks and simulated animation checks for one burst per crossed node, retention of the comet trail, natural cleanup, interruption and reduced motion. Finalization verifies identical source/snapshot bytes and resolution of the shared data script. No visual or behavioral changes are introduced by the final copy.
