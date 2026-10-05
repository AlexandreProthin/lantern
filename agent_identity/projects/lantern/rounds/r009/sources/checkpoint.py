from pathlib import Path
import csv,json,hashlib
p=Path(__file__).resolve().parents[3];r=p/'rounds/r009'
def write(path,text):path.write_text(text+'\n',encoding='utf-8')
assert 'State revision 20' in (p/'STATE.md').read_text(encoding='utf-8-sig')
assert 'Revision 18' in (p/'REQUEST.md').read_text(encoding='utf-8-sig')
items=json.loads((r/'sources/lineage.json').read_text())
old={k.replace('\\','/'):v for k,v in json.loads((p/'rounds/r008/evidence/manifest.json').read_text()).items()}
anchors=['rounds/r007/sources/r007-c01-16.svg','rounds/r006/sources/r006-c01.svg']
for name in anchors:assert hashlib.sha256((p/name).read_bytes()).hexdigest()==old[name]
for c in items:
 write(r/'candidates'/f"{c['id']}.md",f"""# {c['id']} — {c['title']}
2026-10-05 Europe/Paris; phase 3/r009; request 18; parent {c['parent']}.
Published for review, no selection. Source sources/{c['id']}.svg.
Hypothesis: {c['caption']}. Body paths from r006-c01; face mask, whole-body pose and optional attachments from accepted r008 family, parameters sources/lineage.json.
Profile c07 is an affine 2D projection (horizontal scale .55, one eye), not a modeled 3D view. Rear c08 mirrors asymmetrical flame and omits face, a proposed rear convention rather than established anatomy. c05 changes curved feet to two flat contact points and raises body by 8 units; human acceptance pending. Other c01..c06 carry accepted vocabulary into consistency comparison, not new human choices.
Frozen: accepted neutral favicon SVG/rule, no palette. Companion-only variants do not replace small icon.
Provenance: agent-authored vector, deterministic build.cjs, Sharp/librsvg versions evidence/renderer.json. No stochastic seed. Evidence sheet.png, evidence/matrix.png, critique.md and manifest.json.
Limits: fixed pose only; actual size, context, recognition and motion untested. Immutable after publication; status changes via LOG.
""")
write(r/'evidence/method.md',"""# Method / verification
Deterministic agent-authored SVG based on accepted r006 body paths and r008 character vocabulary. Masks create transparent facial cutouts. Common 120×124 viewBox, 240×248 hero and square 32/48/64/128 diagnostic outputs with aspect padding; body is smaller than output bounds. Sharp/librsvg default SVG rasterization, Lanczos3 resizing, versions renderer.json. sRGB foreground #eeeeee on #181818 or #181818 on white; test polarities only, no chosen palette.
Visually inspected sheet.png, evidence/matrix.png and evidence/anchors.png via image viewer. Matrix places PNGs at native size; screen/conversation viewer may scale. No browser-DPI/perceptual/participant tests.
64 diagnostic character PNGs, eight transparent hero PNGs, eight neutral anchor diagnostic PNGs. SHA-256 of both neutral anchor sources verified equal to r008 manifest. Re-rendered neutral diagnostics are illustrative, not a new favicon robustness pass; Round 2 tests/limits remain authoritative.
07: horizontal affine projection, not true side geometry. 08: mirror/no-face convention, not a 3D back. There is no physical simulation, animation, gesture timing or locomotion evidence.
""")
write(r/'evidence/critique.md',"""# Static consistency critique
Observed in sheet and native matrix: front-family c01–c06 maintains two uprights, asymmetric flame, base and loop. c02/c03 eyes lie inside flame; c04 arc cutouts remain separate at large sizes. c05 has two flat feet touching the same baseline beneath raised base. c06 rotates about loop and retains a connected suspension line, feet absent. No clipping observed in the published bounds.
At 32 eyes/paupières are tiny, eye-direction differences weak, suspension line and feet thin. At 64/128 facial differences and attachment logic are clearer. Labels convey emotional intent but no user perception test validates those meanings. 04 may look asleep or smiling rather than attentive.
07 narrows frame, flame, base and loop consistently, but looks stretched/thin; its small eye collapses and it does not establish side depth. 08 preserves outline family but could simply read as a face-less front. The flipped flame is a graphic proposal; face/no-face cannot alone prove rear orientation.
Agent recommendation: keep c01–c06 as front pose vocabulary; retain c07/c08 as provisional orientation studies rather than lock a volume model. No human rejections or new selection. Flat feet are a controlled proposal for planted support, not assumed acceptance of a replacement for r008 curved feet.
Frozen neutral favicon anchor source hashes verified unchanged. None of these companion studies changes phase-2 assets; if future anchor geometry changes, record invalidations and retest 16/24/32/48 both polarities. Current small-icon limitations remain.
Next user decision: accept or refine pose family, especially feet and profile/back conventions. After character convergence, document orientation/simplification rules before phase closure. Motion phase not initiated.
""")
write(r/'pose-rules-proposed.md',"""# Pose rules v2 — proposed
Inherited accepted vocabulary: r008-c01..c06, D0015. D0015 does not accept new r009 changes automatically.
Keep frame/flame/base/loop recognizable. Face within flame; neutral icon remains face-less. Inclination uses whole-body rigid transform rather than deformation of frame. Suspended pivot attaches at loop, feet absent. Posé feet attach under base; new flat contact feet in c05 require review.
Front orientation: current accepted graphic vocabulary. Profile: proposed narrower single-eye projection, depth unresolved. Back: proposed reflected flame with no face, disambiguation unresolved. No forced fully modeled 3D body.
Responsive proposal: 16–48 favicon uses accepted neutral sources. Companion below 64: default neutral simplification proposed because detail is fragile; this is not a selected product size or final threshold. At 64+ facial vocabulary is visually clearer in diagnostics; validate intended size/context later.
No causal state mappings, action triggers, timing, easing or motion selected here.
""")
write(r/'ROUND.md',"""# r009 — static pose consistency / phase 3
Request 18/base state 20; contract 2/rubric 1 accepted. Eight branches from accepted r008 family; parents and parameters sources/lineage.json. One common sheet, one illustration per study; editable SVG sources preserved.
Divergence/mutation: six frontal poses carry accepted vocabulary, flat-contact feet test support, profile/back propose graphic orientation conventions. No neutral favicon mutations.
Stress screening: 32/48/64/128 both polarities (64 PNGs), visual inspection, hash verification of unchanged 16/24–256 anchors. Native neutral 16/24/32/48 illustration retained. No actual product context or participant recognition tests.
Critique complete, evidence/critique.md. Agent defers profile/back volume lock; no human rejection. c01–c06 front family recommended, c07/c08 provisional. Elimination/convergence await user feedback; no invented loop completion, phase closure, motion or palette.
Next: record explicit pose/orientation feedback before dependent refinement or closure. Accepted r008 family remains historical basis; r009 candidates are proposals. Next new candidate c09, next attempt r010 when needed.
""")
manifest={str(path.relative_to(p)).replace('\\','/'):hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted((r/'sources').glob('r009-c*.svg'))}
manifest.update({name:hashlib.sha256((p/name).read_bytes()).hexdigest() for name in anchors})
write(r/'evidence/manifest.json',json.dumps(manifest,indent=2))
with (p/'LOG.md').open('a',encoding='utf-8') as f:f.write('\n## E0030 — 2026-10-05 Europe/Paris — static pose consistency review\nRequest 18/r009. Eight SVG studies, common sheet, 64 light/dark character PNGs and unchanged neutral-anchor diagnostics visually inspected. Body family maintained frontally; flat planted feet proposed, profile as affine compression and back as mirror/no-face remain orientation hypotheses. Hashes of phase-2 anchors equal r008 manifest. Agent recommends front vocabulary, defers volume lock. No human rejection/convergence or phase closure. No motion/palette/release. Waiting for pose/orientation feedback.\n')
files=sorted(x for x in r.rglob('*') if x.is_file())+[p/'REQUEST.md',p/'LOG.md']
first=557;last=first+len(files)+1
state=f"""# Current checkpoint — Lantern
State revision 21; 2026-10-05 Europe/Paris; harness 1.0.
Phase 3 active, r009, static pose/angle screening complete, awaiting user review.
Request 18 consumed by r009; verbatim \"go\" after static pose-consistency task; contract 2/rubric 1 accepted.
Latest human D0015 accepts r008-c01..c06. New r009-c01..c08 are pending review; parent mapping sources/lineage.json. No exclusive winner/rejection inferred.
Main sheet rounds/r009/sheet.png; native evidence rounds/r009/evidence/matrix.png; critique rounds/r009/evidence/critique.md; proposed rules rounds/r009/pose-rules-proposed.md.
Completed: eight fixed pose/view studies; front-family continuity screening, 32/48/64/128 light/dark renders, visual review and SHA-256 verification of unchanged favicon anchors.
Neutral favicon r007-c01 at 16 / r006-c01 at 24–256 remains accepted. Character layers/poses do not replace it.
Open: flat-contact feet acceptance; profile/back conventions; actual product size/context/perception. Details weak at 32, profile thin, back may read as no-face front. No universal success, physical/3D model, animation, palette, phase closure or release.
Agent recommendation: front c01–c06; c07/c08 orientation provisional, no human elimination.
Next exact action: user reviews pose family and profile/back; capture verbatim new request before refinement/closure. Do not start motion without phase instruction.
Latest E0030/D0015; next E0031/D0016; next candidate r009-c09; next attempt r010 when justified; next artifact A{last+1:04d}.
Checkpoint rounds/r009/checkpoints/c001.md; commit manifest E0029/E0030, request 18, A0557–A{last:04d}.
"""
write(r/'checkpoints/c001.md',state);files += [r/'checkpoints/c001.md',p/'STATE.md']
with (p/'ARTIFACTS.csv').open('a',encoding='utf-8',newline='') as f:
 w=csv.writer(f)
 for n,path in enumerate(files,first):
  cid=next((c['id'] for c in items if c['id'] in path.name),'');parent=next((c['parent'] for c in items if c['id']==cid),'')
  kind='source' if path.suffix=='.svg' else 'evidence' if path.suffix=='.png' else 'documentation'
  w.writerow([f'A{n:04d}','r009',cid,kind,str(path.relative_to(p)).replace('\\','/'),json.dumps([parent] if parent else sorted(set(c['parent'] for c in items))),18,'published-review','E0029/E0030',''])
write(p/'STATE.tmp.md',state);(p/'STATE.tmp.md').replace(p/'STATE.md')
assert 'State revision 21' in (p/'STATE.md').read_text()
print(f'r009 checkpoint c001 saved; A0557–A{last:04d}; anchors unchanged.')
