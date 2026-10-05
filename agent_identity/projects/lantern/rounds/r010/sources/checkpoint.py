from pathlib import Path
import csv,json,hashlib
p=Path(__file__).resolve().parents[3];r=p/'rounds/r010'
def write(path,s):path.write_text(s+'\n',encoding='utf-8')
assert 'State revision 22' in (p/'STATE.md').read_text(encoding='utf-8-sig')
assert 'Revision 20' in (p/'REQUEST.md').read_text(encoding='utf-8-sig')
specs=json.loads((r/'sources/specs.json').read_text())
verify=json.loads((r/'evidence/verification.json').read_text());assert not verify['errors']
accepted=json.loads((p/'rounds/r009/accepted-source-manifest.json').read_text())
for name,digest in accepted.items():assert hashlib.sha256((p/name).read_bytes()).hexdigest()==digest
for s in specs:
 write(r/'candidates'/f"{s['id']}.md",f"""# {s['id']} — {s['name']}
2026-10-05 Europe/Paris; phase 4/r010; request 20; parent {s['parent']}.
Published for review, no human selection. Hypothesis: {s['meaning']}; duration {s['duration']} ms. Trigger proposal: {s['trigger']}. Static/reduced counterpart: {s['fallback']}.
Source: sources/motion.js shared finite time model, sources/body.js accepted geometry, review.html/sources/review.js playback and interruption, sources/{s['id']}-static.svg fallback. Editable parameters in pose()/still(); no external network resources.
Provenance: agent-authored SVG/JavaScript, Sharp/librsvg evidence/renderer.json, Chromium evidence/verification.json; GIF via FFmpeg at 20 fps, 960×720, 100 frames/5 s. No stochastic generation/seed. Body paths exact r006-c01, feet/face from accepted vocabulary.
Evidence: motion-preview.gif (repeating comparison only), review.html (finite deliberate playback), sampled motion-*.png, native diagnostic PNGs, browser screenshots/checks. Narrative meanings are agent hypotheses, not participant-validated.
Static/reduced skips spatial motion and immediately represents the target posture. Pause preserves time; interrupt eases 180 ms to stable posture, preserving travel/flight position; hide cancels, show restores immobile, page hidden cancels playback. Favicon untouched.
Known limits: steps stylized, no contact/physics guarantee; heating not independently encoded; no autonomous product event mapping, room integration, profile-turn/chute testing or distraction/user-perception pass. Immutable after publication.
""")
write(r/'motion-grammar-proposed-v1.md',"""# Motion grammar v1 — proposal for review
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
""")
write(r/'evidence/method.md',"""# Rendering and checks
Shared deterministic SVG time model sources/motion.js used by browser and FFmpeg frame export, with exact accepted r006 body paths in body.js. Monochrome test colors only; transparent mask eye counterforms. 140×148 viewBox includes travel and suspension bounds. Preview actors 180 px wide; actual body is smaller than outer SVG bounds.
Sharp/librsvg versions renderer.json; 36 native mid-gesture renders at 32/64/128 output px, both polarities; these are output bounds, not body height. PNG keyframes at 0/600/1400/2400/3600 ms and reduced-mode board. Animated GIF: 960×720, 20 fps, 100 frames, 0.5 s opening hold, ≤3.6 s gesture window, ending hold, repeating for comparison. Interactive prototype is static on load, finite on deliberate play. GIF cannot honor system reduced-motion; review.html can.
Chromium version/check list verification.json. Browser checks: play, pause/frozen time, resume, finite end, interruption preserving x/y, reduced skips spatial playback, hide/show, scrub, 64px light background, 360px layout no horizontal overflow, initial OS reduced preference, finite sampled model values. Screenshots retained and visually inspected for dark mid-frame, light 64px, narrow layout. Corrected composite PNG/GIF stroke-color substitution before publication and re-rendered/re-inspected.
Node child-process spawning was unavailable inside sandbox; explicitly approved local execution used for Chromium and FFmpeg. First browser launch also referenced a missing default build; used already-installed Chromium 1243, no installation. Temporary tool failures not design failures. Published verification is of final code.
Visual review covers sampled frames and screenshots, not an independent participant assessment of animated rhythm. SHA-256 verifies accepted static parents/anchors unchanged. No product events implemented, no physics or participant/DPI/distraction validation.
""")
write(r/'evidence/critique.md',"""# Motion critique / first review
Observed in sampled frames/browser renders: shape paths remain unchanged; small angle and location changes preserve frame/flame/base/loop. Eyes remain in flame. Feet visible below base, absent during suspension/lift; pivot connects loop. Browser controls retain static-on-load, finite end, interruption and reduced fallback behavior under automated checks.
Agent inference: c01/c02 offer restrained responses; c04 damped settling suits loop attachment. c03 communicates short travel but its two alternating steps are schematic, foot slip/contact not physically validated. c05 conveys elevation with no independent thermal cue; label heating refers to user's historical potential, not evidence of heat. c06 is deliberate gentle descent/landing, not a tested gravity drop or dangling release.
At small output bounds facial/step distinctions are weak; no exact product size or universal readability claim. Intensity, semantic interpretation and whether these distract during learning require user/product-context judgment. Comparison GIF repeats; proposed everyday behavior does not.
Recommendation: keep finite, user-controllable motions and immobile default. Review rhythm and attachment choices before adding heat effects, longer travel, gravity drop, turns or room transitions. No eliminations or acceptance yet. Cross-scene continuity from arbitrary current states remains an integration task, not declared passing.
""")
write(r/'ROUND.md',"""# r010 — phase 4 first movement study
Request 20/base state 22; contract 2/rubric 1 accepted. Six motion branches from accepted character sources, no mandated product state count.
Divergence/mutation: attention blink, curiosity, feet/travel, damped suspension, lift and gentle descent; finite deterministic curves and static counterparts. Parents sources/specs.json. One illustration per sample in common animated comparison.
Review: motion-preview.gif and offline review.html; controls for one-shot replay, pause/resume, interruption, hide, scrub, reduced mode, polarity and size. Immoveable default; no product installation.
Stress checks: bounded model samples, native 32/64/128 mid-gesture polarities, finite end, pause, interruption on-place stabilization, reduced and OS preference, hide/show, responsive 360px. Browser results evidence/verification.json; visual sampled-frame review and limitations evidence/critique.md. Accepted parent/anchor SHA-256 unchanged.
Critique complete; no human selection, no elimination, no convergence/phase closure. Genuine steps/heat cue/drop/turn/room transitions and actual-context distraction remain open. No palette, release or integration.
Next: user reviews timing/amplitude and retained motions; save verbatim before further mutation or motion-grammar acceptance. New IDs for changes; no silent promotion.
""")
manifest={str(path.relative_to(p)).replace('\\','/'):hashlib.sha256(path.read_bytes()).hexdigest() for path in [r/'review.html',r/'sources/motion.js',r/'sources/review.js',r/'sources/body.js',r/'motion-preview.gif']}
manifest.update(accepted);write(r/'evidence/manifest.json',json.dumps(manifest,indent=2))
with (p/'LOG.md').open('a',encoding='utf-8') as f:f.write('\n## E0033 — 2026-10-05 Europe/Paris — first movement review\nRequest 20/r010. Six deterministic finite motion samples, repeating comparison GIF and offline interactive review; static/reduced fallbacks, control/interruption checks and sampled-frame visual review preserved. Final browser checks pass; local process launch limitations resolved through approved test execution. Composite stroke color repaired before publication. Agent proposes calm finite motions; stylized gait/heating cue/gentle descent limits retained. Accepted static sources/anchors verified unchanged. No human selection/rejection or motion-grammar acceptance, phase closure, palette or release. Waiting for rhythm/amplitude feedback.\n')
files=sorted(x for x in r.rglob('*') if x.is_file())+[p/'REQUEST.md',p/'LOG.md']
first=688;last=first+len(files)+1
state=f"""# Current checkpoint — Lantern
State revision 23; 2026-10-05 Europe/Paris; harness 1.0.
Phase 4 active, r010; first six movement studies ready for review.
Request 20 consumed by r010; user \"go\" after explicit motion-stage proposal. Contract 2/rubric 1 accepted; character D0015/D0016 remains accepted.
Candidates r010-c01..c06, parents in rounds/r010/sources/specs.json. No new human selection/acceptance or rejection.
Review rounds/r010/motion-preview.gif (repeating comparison) and review.html (finite one-shot playback, offline sources). Proposed grammar rounds/r010/motion-grammar-proposed-v1.md.
Completed: six motion hypotheses, static/reduced fallbacks, browser/control tests, 36 native mid-gesture diagnostic PNGs, keyframes, visual sampled-frame critique and hash verification of accepted static sources/neutral favicon.
Limits: walk stylized, no contact physics; heating cue not explicit; descent gentle, no actual gravity drop; profile turns/room transitions/arbitrary state-to-state continuity/product-context distraction untested. Companion size/palette undecided. No product integration/release.
Controls: default immobile, finite replay, pause/resume, interrupt stabilizes on place in 180 ms, hide cancels/show immobile, reduced skips spatial animation and respects initial OS preference. GIF is demonstration-only repetition.
Next exact action: receive feedback on pace/amplitude and retained gestures; record new request before controlled changes/grammar acceptance. Do not infer choice from recommendations or passing tests.
Latest E0033/D0016; next E0034/D0017; next candidate r010-c07; next attempt r011 when justified; next artifact A{last+1:04d}.
Checkpoint rounds/r010/checkpoints/c001.md; commit manifest E0032/E0033, request 20, A0688–A{last:04d}.
"""
write(r/'checkpoints/c001.md',state);files+=[r/'checkpoints/c001.md',p/'STATE.md']
with (p/'ARTIFACTS.csv').open('a',encoding='utf-8',newline='') as f:
 w=csv.writer(f)
 for n,path in enumerate(files,first):
  cid=next((s['id'] for s in specs if s['id'] in path.name),'');parent=next((s['parent'] for s in specs if s['id']==cid),'')
  kind='evidence' if path.suffix in ['.png','.gif'] else 'source' if path.suffix in ['.js','.cjs','.svg','.html'] else 'documentation'
  w.writerow([f'A{n:04d}','r010',cid,kind,str(path.relative_to(p)).replace('\\','/'),json.dumps([parent] if parent else sorted(set(s['parent'] for s in specs))),20,'published-review','E0032/E0033',''])
write(p/'STATE.tmp.md',state);(p/'STATE.tmp.md').replace(p/'STATE.md')
assert 'State revision 23' in (p/'STATE.md').read_text()
print(f'r010 checkpoint saved; A0688–A{last:04d}; browser controls pass, accepted sources unchanged.')
