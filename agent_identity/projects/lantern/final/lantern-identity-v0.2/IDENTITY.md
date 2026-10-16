# Lantern identity v0.2 — review package
Prepared 2026-10-06. Status: review, not an accepted final release. Not installed in Lantern. Supersedes the v0.1 review (rounds/r015/package, kept unchanged).

## Accepted lineage
D0014: r007-c01 optical 16 px favicon, r006-c01 master at 24–256. D0017: six r010 gestures. D0018: r011 outer living-flame contour. D0019: r012-c01 Amber ember. D0020: r013-c01 living inner layers. D0024: r013-c01 confirmed as the flame after comparing it in motion with flame-physics alternatives (r017, r018); D0023 mix superseded.
D0021: r016-c01 lit frame, r016-c02 ember favicon. D0022: r016-c05 clear space and minimum sizes, r016-c07 per-background tokens (both by delegation to the agent's recommendation).
Not adopted (draft kept): r016-c03 app tile, r016-c04 flat 32–64 tier, r016-c06 ground light. Reusable fragments only.

## Changes since v0.1
- Frame is lit by the flame: radial gradient centred on the flame (warm on inner struts and base, darker toward the loop). Geometry unchanged.
- Favicon gains an ember variant: ink frame + one flat amber flame fill. Monochrome stays as the single-color fallback.
- Token sets per background instead of one set (see Tokens).
- Clear space and minimum sizes are now defined (see below), replacing the v0.1 "no metric yet".

## Invariants and variants
Keep suspension loop, split frame, asymmetric flame and rounded base recognizable. Lower flame bowl and eyes stay anchored in the actor. Feet optional; suspension attaches to the loop. Do not stretch proportions or recolor individual layers outside the token sets.
- Ember favicon (default for tabs/taskbar): 16 uses the optical enlarged-loop source, 24–48 the master. Ink #eeeeee + flame #f39a3a on dark; ink #181818 + flame #d0561a on light. No eyes, glow or motion.
  - App exception (2026-10-16, by the user): inside the running Lantern app the flat flame takes the current room's accent (header mark, window and taskbar icon); the ink and geometry are unchanged. Installer and exe icons keep #f39a3a. See rooms-spaces RS-53.
- Mono favicon: single ink, for OS masks and one-color contexts.
- Mark: face-free warm layered flame, lit frame, per-background tokens; 64/128/256/512 for on-dark, on-learn, on-light.
- Companion: face and feet vocabulary, six static poses per background at 64/128/256, plus the animated runtime.

## Clear space and minimum sizes
Clear space = one loop height (20 units on the 100-unit master, ~0.2 x icon height) on every side of the ink box. The halo may extend into it; nothing else may. Raster PNGs keep the full source viewBox (glow, feet, attachment room); do not trim the halo to align ink.
| Tier | Use | Sizes |
|---|---|---|
| Mono favicon | single-color, OS masks | 16–24 (and above if one color is required) |
| Ember favicon | tabs, taskbar small | 16–48 |
| Mark | app icon, splash, about | >= 64 |
| Companion | rooms | >= 64 (face legible) |
These are system rules proposed by the agent and taken by delegation; native-DPI perception has not proven them.

## Tokens (sRGB)
Flame (all backgrounds): middle #ffac38, core #fff2b3; bloom blur 6 units, reflected base rim .45.
| Background | bg sample | frame | outer flame | halo | lit frame near → far |
|---|---|---|---|---|---|
| neutral dark | #181818 | #9b7254 | #c94b16 | .20 | #ebbb88 → #7a573f |
| Learn | #101827 | #a57a5a | #c94b16 | .24 | #efc08c → #86624a |
| light | #f4eee3 | #6e4a32 | #b8410f | none | #9a6a44 → #5e3f2a |
Source of truth: runtime/sources/system.js (CTX, T). Frame/background contrast (WCAG formula): neutral 4.2:1, Learn 4.7:1, light 6.8:1.

## Motion (unchanged from v0.1)
Outer 1200 ms contour cycle, inner 2400 ms phase-offset curves; lower bowl anchored, face/frame steady. Six finite accepted gestures. Default still; pause freezes; interrupt stabilizes over 180 ms; hidden/background cancels; show stays still. OS reduced-motion uses static poses. No automatic idle loop or product-event triggers. Favicon and mark never require motion.

## Known limits
- On the light background the eyes are faint: they are mask cut-outs showing the pale background (accepted face construction, unchanged). Decide before finalization whether to keep that, or fill the eyes for light surfaces.
- The flame feedback "feels ghosty" (r016) was answered by the user keeping r013-c01; the physics alternatives remain in rounds/r017–r018 if this is reopened.
- Not tested: native DPI/perception, real room placement and distraction, Windows .ico/.png icon pipeline, arbitrary gesture chaining, profile/back views, permanent idle policy.

## Release acceptance
Before a named final release: user reviews this package, decides the light-background eyes and resolves or explicitly defers the untested items. Final snapshots go to final/ only after explicit named acceptance.
