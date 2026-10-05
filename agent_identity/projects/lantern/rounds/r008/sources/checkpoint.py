from pathlib import Path
import csv, json, hashlib
p=Path(__file__).resolve().parents[3]; r=p/'rounds/r008'
assert 'State revision 18' in (p/'STATE.md').read_text(encoding='utf-8-sig')
assert 'Revision 16' in (p/'REQUEST.md').read_text(encoding='utf-8-sig')
def put(path,s): path.write_text(s+'\n',encoding='utf-8')
items=json.loads((r/'sources/lineage.json').read_text())
for c in items:
 put(r/'candidates'/f"{c['id']}.md",f"""# {c['id']} — {c['title']}
2026-10-05 Europe/Paris; phase 3/r008; request 16; parent r006-c01.
Published for review; no human selection. Source sources/{c['id']}.svg.
Mutation/hypothesis: {c['mutation']}
Inherited: exact frame/flame/base/loop paths from r006-c01. Whole-body pose transforms and transparent face masks only; optional attachments. Accepted neutral favicon anchors remain separate and unchanged.
Provenance: agent-authored SVG, deterministic build.cjs, Sharp/librsvg versions evidence/renderer.json; no stochastic model/seed. References r006-c01 and r007-c01 accepted sources.
Evidence: sheet.png and evidence/matrix.png, critique.md. Single fixed pose per hypothesis; no pose-range/front-profile-back validation. Detailed motion/palette/companion size unresolved.
Immutable after publication; later selection recorded in LOG.
""")
put(r/'evidence/method.md',"""# Conditions
SVG vector studies from accepted parent paths, transparent cutout eyes via masks. Common 120×124 viewBox; 240×248 illustration on sheet, 32/48/64/128 square diagnostic outputs (viewBox aspect preserved with padding). The body occupies less than total output height; these are character bounds, not favicon exports.
Sharp/librsvg, versions renderer.json, default SVG rasterization and Lanczos3 resizing. sRGB, foreground #eeeeee/background #181818 or foreground #181818/background white. Comparison colors not an approved palette.
Actual visual inspection: sheet.png and evidence/matrix.png via image viewer. Native pixels in matrix; conversation viewer may scale. No browser/DPI or participant test.
Accepted 16 and 24–256 neutral favicon sources unchanged; source hashes in manifest.json. No new favicon variant proposed. If character detail is later required inside favicon, reopen phase 2 and test 16/24/32/48 both polarities.
Initial matrix rendering failed due to missing closing SVG tag; corrected in same unpublished attempt, rerendered and visually inspected. Tool failure not a design failure.
""")
put(r/'evidence/critique.md',"""# Critique — first phase-3 divergence
Observed: all six retain frame, asymmetric central flame, base and loop. 01 gives minimal personification through inclination. 02 locates attention within flame with two visible cutouts. 03 combines inclination and eye placement; their effects cannot be isolated in this comparison. 04 reads as closed eyes/arcs rather than directed attention. 05 adds two visible attachments under the base. 06 connects suspension line to loop; recognizable tilted body remains below it.
At 32 px eye counterforms are tiny, lateral intent and eyelid shape weak; at 64/128 the expressive differences are clearer. Feet are minimal at 32. No universal recognition success claimed. Neutral favicon anchor is unchanged, avoiding dependence on facial detail.
Agent inference: 02 is the clearest restrained base for further expression study; 01 is a useful minimal-personification reference. 03 could serve curiosity, 04 calm but may imply sleep/closed attention. 05/06 are compatible attachment/pose options rather than exclusive identities. Their emotional meanings require user judgment.
No human rejection or convergence. Agent recommendation only: develop 02 and evaluate 03/04 as future expressions; keep 05/06 as optional posture/attachment studies. No elimination yet. Actual pose range, profile/back, product placement and perception tests deferred until direction feedback. Static board does not validate locomotion, balancing, interruption or motion grammar.
""")
put(r/'ROUND.md',"""# r008 — phase 3 / character potential
Request 16/base state 18, contract 2/rubric 1 accepted. Mode branch, six hypotheses with parent r006-c01; responsive neutral anchors retained.
Divergence complete: six SVG studies, one illustration each in a common sheet, optional expression/pose/attachments. Critique and native 32/48/64/128 light/dark screening complete. First exploration only; no front/profile/back or full pose-range pass.
Elimination, feedback-led mutation and convergence awaiting user direction. No fabricated closed loop. Agent recommendation c02 as restrained expressive base; c01 minimal reference; c03/c04 expression options and c05/c06 attachment options. No human winner inferred, no phase closure.
No changes to published phase-2 sources/rule; no release/integration. Next: obtain numbered feedback, capture verbatim in new request before dependent refinement. Resume same active round if appropriate; reserve new candidate IDs for mutations.
""")
manifest={}
for path in [p/'rounds/r006/sources/r006-c01.svg',p/'rounds/r007/sources/r007-c01-16.svg']+sorted((r/'sources').glob('r008-c*.svg')):
 manifest[str(path.relative_to(p))]=hashlib.sha256(path.read_bytes()).hexdigest()
put(r/'evidence/manifest.json',json.dumps(manifest,indent=2))
put(r/'character-rules-proposed.md',"""# Character rules — provisional, for review
Invariants: two soft uprights, central asymmetric flame, compact base, suspension loop. Neutral favicon keeps its accepted source and no facial detail.
Expression study: face may be absent or minimal cutouts inside flame; no mouth/eyebrows imposed. Directional gaze, calm arcs and body inclination are hypotheses, not semantic state mappings.
Attachments study: optional feet originate below base, retract when suspended; suspension uses loop. No limbs or species chosen. Whole-body poses preserve component geometry, though transformed outline differs from favicon.
Next validation after feedback: controlled expressions and front/profile/back if useful; actual product size; responsive small-size simplification. No motion grammar at this stage.
""")
with (p/'LOG.md').open('a',encoding='utf-8') as f:
 f.write('\n## E0027 — 2026-10-05 Europe/Paris — phase 3 first review\nRequest 16/r008. Six editable SVG studies, common single-illustration sheet, 48 native polarity/size PNGs, visual inspection and critique. Agent recommends c02 as restrained base; no human selection/rejection or phase closure. Initial malformed matrix SVG repaired before publication. Phase-2 anchors unchanged; masks/attachments confined to character studies. Waiting for numbered feedback before mutations; no animation.\n')
files=sorted(x for x in r.rglob('*') if x.is_file())+[p/'REQUEST.md']
start=460; last=start+len(files)+1
state=f"""# Current checkpoint — Lantern
State revision 19; 2026-10-05 Europe/Paris; harness 1.0.
Phase 3 active, attempt r008, first divergence/critique complete, awaiting user review.
Request 16 consumed by r008; user verbatim \"go\"; contract 2/rubric 1 accepted.
Six hypotheses r008-c01..c06, parent r006-c01, sources rounds/r008/sources/. No new selection; D0014 remains latest human decision.
Accepted favicon anchors unchanged: r007-c01 at 16, r006-c01 at 24–256. Character eyes/feet/suspension are optional proposals, not accepted anatomy.
Completed: one common sheet with one illustration per hypothesis, 48 native character PNGs, visual review, critique and source hash manifest. Main review rounds/r008/sheet.png; tests rounds/r008/evidence/matrix.png.
Agent recommendation c02; minimal reference c01; expression options c03/c04, attachment options c05/c06. No human rejection.
Limits: details weak at 32, actual product size/perception/front-profile-back/full pose range untested. No phase closure, animation, palette or release.
Next exact action: receive numbered feedback; record verbatim new request before controlled refinement. Do not regenerate published candidates. Mutation needs new IDs; phase-2 reopening only if neutral anchor altered.
Latest E0027; next E0028/D0015; next unused candidate r008-c07; next attempt r009 only when new attempt justified. Next artifact A{last+1:04d}.
Checkpoint rounds/r008/checkpoints/c001.md; commit manifest E0026/E0027, request 16, A0460–A{last:04d}.
"""
put(r/'checkpoints/c001.md',state)
files += [r/'checkpoints/c001.md',p/'STATE.md']
with (p/'ARTIFACTS.csv').open('a',encoding='utf-8',newline='') as f:
 w=csv.writer(f)
 for n,path in enumerate(files,start):
  relative=str(path.relative_to(p)).replace('\\','/');cid=next((c['id'] for c in items if c['id'] in path.name),'')
  kind='source' if path.suffix=='.svg' else 'evidence' if path.suffix=='.png' else 'documentation'
  w.writerow([f'A{n:04d}','r008',cid,kind,relative,json.dumps(['r006-c01']),16,'published-review','E0026/E0027',''])
put(p/'STATE.tmp.md',state);(p/'STATE.tmp.md').replace(p/'STATE.md')
assert 'State revision 19' in (p/'STATE.md').read_text()
print(f'Checkpoint saved; A0460–A{last:04d}; review sheet {r / "sheet.png"}')
