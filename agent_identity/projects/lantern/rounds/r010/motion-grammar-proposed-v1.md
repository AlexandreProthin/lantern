# Motion grammar v1 — proposal for review
Request 20/r010, accepted character v2 as base. Six samples are test coverage, not a fixed count of application states.

| ID | Trigger proposal / meaning | Duration and gesture | End / static-reduced |
|---|---|---|---|
| c01 | Available; optional attention cue, not a timer loop | 2400 ms scene; one blink at 720–1032 ms, no body movement | Neutral attentive face |
| c02 | A requested response to a new idea; curiosity | 1800 ms; ease toward 6°/3-unit gaze, brief hold, return | Static 3°/lateral gaze to preserve expressive option |
| c03 | User-selected nearby destination; short travel | 3200 ms; 576 ms feet emergence, movement over 2176 ms, ±12 units, two stylized stride cycles | Destination x12, raised base y−8, flat feet |
| c04 | Attachment requested; suspended settling | 3600 ms; pivot at loop (50,4), damped two-cycle sine, upper bound 7° | Attached, no feet, no rotation |
| c05 | Flotation requested; gentle lift | 3200 ms; anticipation 800 ms, eased lift to y−17 by 2720 ms | Hover immobile |
| c06 | Return to support requested; descent/landing | 3000 ms; eased descent y−17→−8, feet emerge 1350–2340 ms, 1.2-unit settling excursion | Feet on support |

All time curves bounded, smoothstep easing. Parameters in sources/motion.js are authoritative; units are relative to body viewBox, not app pixels. Scenes can be played individually or together, pause/resume, scrub, hide, or interrupt. Repetition exists only in the comparison GIF; interactive scenes run once and stop. No automatic timer/idle replay.
Interruption: 180 ms smoothstep stabilizes angle/expression/stride; travel and flight preserve current x/y and current foot extension. Reduced mode uses no spatial animation, immediately applies selected static fallback. OS prefers-reduced-motion activates reduced mode; user can choose the study mode explicitly. Hide immediately removes actors and cancels animation; showing restores static, no unsolicited replay. Background page cancels playback.
Transition policy proposal: each scene is isolated; replay explicitly resets its starting pose. This prototype does not implement cross-room/event transitions from arbitrary current product states. Before integration, define continuity and interruption destinations for event chains. No exclusive trigger mapping or decorative/functional classification accepted yet; meanings/labels do not imply real product events.
Rest/concentration: immobile default, no infinite breathing/bounce. No animation information is required for reading the study labels; static counterparts preserve posture vocabulary. Perceived distraction in real Learn context remains untested.
Invariants: frame, asymmetrical flame, base and loop retained. Face optional; no body-path deformation. Support feet extend under base, suspension connects loop. Favicon SVG/rule unchanged; no motion required for 16 px identity.
Pending: user judgment of pace/amplitude, genuine step-contact refinements, a distinct heating cue if needed, release/fall versus gentle descent, turns/profile/back movement, room transition use, final companion size and product-context attention testing. No palette chosen.

