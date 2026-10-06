# Implementation recipe — v0.2
Open runtime/review.html offline (or through any static server). Load in order: body.js, motion.js, favicons.js, system.js, styles.js. styles.js keeps the raw renderer as LanternMotion.rawSvg and wraps LanternMotion.svg; loading it twice throws.

## API
- `LanternMotion.context = 'neutral' | 'learn' | 'light'` selects the token set for the surface behind the actor.
- `LanternMotion.svg(index, pose, uniqueId)` renders the styled companion (lit frame, context tokens, face).
- `LanternMotion.pose(index, time)` gives the accepted gesture pose; `still(index)` the static/reduced destination.
- `LanternIdentity.mark(ctx, uniqueId)` renders the face-free mark; `LanternIdentity.favicon(size, ctx, ember)` the favicon (`ember=false` for mono).
- `LanternSystem.actor(options)` is the low-level renderer. With every option off it reproduces the r015/r013-c01 output exactly. Options that were not adopted (`flat`, `thick`, `ground`, `tile`) are kept for reference only; do not use them in product.
Use a unique SVG ID per actor instance. Markup is generated from internal sources only; never inject untrusted strings into IDs.

## Behaviour
Explicit play owns a finite scene clock. On interruption, preserve current x/y/feet (see sources/review.js), stabilize over 180 ms, then hold still or show the reduced pose. Cancel on hidden/background and do not replay on show. Keep permanent idle disabled until agreed. Define continuity from arbitrary states before binding real room events.

## Assets
- exports/favicon: `ember-on-dark-N`, `ember-on-light-N`, `mono-on-dark-N`, `mono-on-light-N` for N = 16/24/32/48. The repeated size suffix in PNG names records source size and PNG size.
- exports/mark: `mark-on-dark|on-learn|on-light` SVG + 64/128/256/512 PNG.
- exports/companion: `gesture-01..06-on-dark|on-learn|on-light` SVG + 64/128/256 PNG.
All transparent. Pick the variant matching the background; warm assets keep their tokens (no CSS tinting). Mono favicon SVGs may be tinted.
Reproduce with rounds/r019/sources/export.cjs (Node + sharp at the configured local path). The rendering tool path is local configuration, not a product dependency. Rerun the dimension/alpha/hash checks after any renderer change.
