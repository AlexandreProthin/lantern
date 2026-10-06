# r016 critique — draft r015 vs propositions
Renderer: sharp/librsvg (sources/render.cjs) for boards; Chromium browser pane for review.html behaviour. Boards inspected visually: board-neutral.png, board-learn.png, board-light.png, favicon-neutral.png.
Draft parity: LanternSystem.actor with all options off is byte-identical to r015 styles.js output (24/24 gesture×time samples).
- c01 lit frame: warmer inner strut edges and base, darker loop, at 64–200 on all three backgrounds. Not perceptible below ~48 px (expected).
- c02 ember favicon: amber flame stays readable at 16/24 on dark; on light #d0561a also reads. Native-DPI tab test still pending.
- c03 tile: glow and mark visible at 32–160; at 32 the frame is thin. Tile color #140f0b–#4a2c18 is a proposal, not tested against Windows accent/taskbar themes.
- c04 flat tier: clearly crisper than draft blur at 32–64; weighted frame visible. Hard edges at 64 look less "volumetric", hence the size cutoff.
- c05 clear space: documentation only, no visual test needed beyond the diagram.
- c06 ground light: subtle pool visible on dark/Learn, faint on light (intended). Fades in flight per altitude formula; arbitrary transitions untested.
- c07 tuning: on light the frame goes from 3.69:1 to 6.76:1 against #f4eee3 and the halo is removed. On Learn #101827, frame 4.17:1 → higher with #a57a5a. No change on neutral (intended).
Browser: no console errors, picks combine in the hero preview, feedback markdown generated, 6 s finite play/still, 375 px width without horizontal scroll. Screenshots unavailable (pane hidden); visual evidence comes from the rendered boards.
Not tested: native DPI perception, real Learn UI placement/distraction, Windows icon pipeline (.ico), combined motion of c06 across all transitions.
