# r017 critique — flame physics vs reference r013-c01
Renderer sharp/librsvg (sources/render.cjs); behaviour in Chromium browser pane. All cards use r016-c01 lit frame + r016-c07 tokens, including the reference.
Inspected: time-neutral/learn/light.png (8 frames, 0–2800 ms), response-learn.png (curiosity tilt, walking, rising, descent, suspension), small-learn.png (48 px).
- Seam: every variant loops exactly at 9.6 s (max numeric diff 0.000). Largest contour step 0.78 units per 60 fps frame (calm, no jumps).
- Physics: flame stays near-vertical on curiosity tilt (counter-rotation 0.9x), trails opposite to walking, squashes when rising and stretches on descent. Visible in response-learn.png.
- c01/c02 bowl: motion reads as upward flow, but the still silhouette is more cone/onion-like than the accepted S-hook. With round bottom + eyes, part of the ghost reading likely remains (agent inference).
- c02/c04 tongues: drawn behind the body, so only the licking part shows. First render had detached dark specks, fixed before publication.
- c03/c04 teardrop + heat: reads as fire first, character second, on all three backgrounds. On light and at 48 px the eyes are faint inside the white-gold core. Eye mask is accepted and unchanged, but this is a legibility risk to resolve if chosen.
- Embers (c04): rare, small, fade within 45% of each cycle; the most distracting element of the round. Untested in real Learn use.
Not tested: native DPI, product distraction, arbitrary gesture chaining with physics lag, reduced motion beyond the static frame.
