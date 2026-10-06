# r017 — flame physics (anti-ghost)
Request 31/base state 33; reopens flame motion/rendering (D0018/D0020) after r016 global feedback. Parent r013-c01; r016-c01 lit frame + r016-c07 tokens applied. Candidates: c01 rising flow (motion only, bowl), c02 c01 + tongues and wisps, c03 c01 + candle teardrop with hot root and crisper edge, c04 all + rare embers.
Physics: procedural contour pinned at the root, upward-travelling waves growing toward the tip, tip height flicker, near-vertical on tilt, lag/squash/stretch from the lantern velocity. 9.6 s seamless cycle. Sources: sources/flame.js, system.js (o.physics hook), variants.js, render.cjs; review.html with scene/gesture selector.
Agent take (hidden in page): c04, embers optional; c03 alone is the strongest single anti-ghost lever. No human selection. r015/r016 unchanged; no final/ write or install.
Next: user saves rounds/r017/feedback.md and says "next".
