import { expect, test } from 'vitest';
import type { RoomVisit, Turn } from '../../core/model';
import { addChooseChild, answerNeed, newChooseSubject, rejectProduct, setNeedsNote, setState } from './rules';
import type { Cell } from './rules';
import { buildContext, fillTarget } from './context';

const locale = { country: 'FR', currency: 'EUR' }, today = '2026-10-15';
function printer(needsNote = 'budget about 500 €') {
  const v = newChooseSubject('3D printer', { tone: 'curious', model: 'opus', effort: 'medium', locale, needsNote }, 'Alex').rooms.choose;
  setState(v, v.rootId, 'lit');
  const add = (kind: Parameters<typeof addChooseChild>[2]['kind'], title: string, parent = v.rootId, hook = '') => addChooseChild(v, parent, { title, hook, kind, createdBy: 'model' }).id;
  return { v, root: v.rootId, add };
}
const cell = (value: string | null, extra: Partial<Cell> = {}): Cell => ({ value, sources: [{ kind: 'manufacturer', name: 'Bambu Lab', url: 'https://bambulab.com', read: '2026-10-01' }], generationId: 'g1', at: '2026-10-15T10:00:00.000Z', ...extra });
/** A board with answered and open needs, ranked criteria, two shortlisted products, a rejected one. */
function board() {
  const { v, root, add } = printer();
  const need = add('need', 'What will you print?'), open = add('need', 'Where will it stand?', root, 'noise matters'), concept = add('concept', 'Enclosure', root, 'fumes');
  setState(v, concept, 'lit');
  const volume = add('criterion', 'Build volume', root, 'size of parts'), noise = add('criterion', 'Noise', root, 'quiet room'), price = add('criterion', 'Price'), skip = add('criterion', 'Warranty');
  setState(v, volume, 'must'); setState(v, noise, 'nice'); setState(v, skip, 'irrelevant');
  const family = add('family', 'Enclosed CoreXY', root, 'fast and closed'), a1 = add('product', 'Bambu A1', family), p1s = add('product', 'Prusa MK4', family), old = add('product', 'Ender 3', family), cand = add('product', 'Elegoo Neptune', family);
  answerNeed(v, need, 'figurines for my kids', 'Alex');
  setState(v, a1, 'shortlisted'); setState(v, p1s, 'shortlisted'); rejectProduct(v, old, 'too slow');
  return { v, root, need, open, concept, volume, noise, price, skip, family, a1, p1s, old, cand };
}
const keys = (v: RoomVisit, task: Parameters<typeof buildContext>[1], focus: string) => Object.keys(buildContext(v, task, focus, { today }).blocks);
function chain(count: number) {
  const { v, add } = printer(); let parent = v.rootId;
  for (let i = 0; i < count; i++) { const id = add('concept', `Concept ${i}`, i % 5 ? parent : v.rootId, `Hook ${i} ${'x'.repeat(110)}`); setState(v, id, 'lit'); parent = id; v.nodes[id].createdAt = `2026-10-02T00:00:${String(i % 60).padStart(2, '0')}Z`; }
  return { v, ids: Object.keys(v.nodes) };
}

test('CA-52.1/CP-53: small map has ids, kinds and states, one focus, the dismissed node, in tree order', () => {
  const t = board();
  const c = addChooseChild(t.v, t.root, { title: 'Resin printers', kind: 'concept', createdBy: 'model' }).id; setState(t.v, c, 'dismissed');
  const { blocks, stats } = buildContext(t.v, 'light', t.family, { today });
  expect(stats.form).toBe('full'); expect(blocks.MAP_BLOCK.match(/^ *- /gm)).toHaveLength(Object.keys(t.v.nodes).length);
  expect(blocks.MAP_BLOCK.match(/<== current node/g)).toHaveLength(1);
  expect(blocks.MAP_BLOCK).toContain(`- ${c} [concept:dismissed] Resin printers`); expect(blocks.MAP_BLOCK).toContain(`  - ${t.old} [product:rejected] Ender 3`);
  expect(blocks.MAP_BLOCK).toContain(`- ${t.volume} [criterion:must] Build volume — size of parts`);
  expect(blocks.MAP_BLOCK.indexOf(t.a1)).toBeLessThan(blocks.MAP_BLOCK.indexOf(t.p1s));
  expect(blocks.PATH_BLOCK).toBe(`PATH TO CURRENT NODE: 3D printer (${t.root}) > Enclosed CoreXY (${t.family})`);
});

test('CA-52.2/3: reduced map keeps every id once, hooks of the neighbourhood, and the floor', () => {
  const { v, ids } = chain(300), focus = Object.values(v.nodes).find(n => n.title === 'Concept 2')!.id;
  const r = buildContext(v, 'more', focus, { today, budgetTokens: 9000 });
  expect(r.stats.form).toBe('reduced'); expect(r.stats.mapTokens).toBeLessThanOrEqual(9000);
  expect([...r.blocks.MAP_BLOCK.matchAll(/^ *- (\S+) \[/gm)].map(m => m[1]).sort()).toEqual([...ids].sort());
  expect(r.blocks.MAP_BLOCK).toContain(`- ${focus} [concept:lit] Concept 2 — Hook 2`);
  const floor = buildContext(v, 'light', focus, { today, budgetTokens: 100 });
  expect(floor.stats.overBudget).toBe(true); expect(floor.blocks.MAP_BLOCK.split('OTHER NODES')[1]).not.toContain(' — ');
  expect([...floor.blocks.MAP_BLOCK.matchAll(/^ *- (\S+) \[/gm)]).toHaveLength(ids.length);
});

test('CA-52.4: dialogue window and the checked turn', () => {
  const { v, a1 } = board(), n = v.nodes[a1];
  const turn = (i: number): Turn => ({ role: i % 2 ? 'user' : 'model', text: `Turn ${i + 1}`, at: n.createdAt, author: i % 2 ? { kind: 'user', by: 'Alex' } : { kind: 'model', model: 'm', generationId: 'g' } });
  n.dialogue = Array.from({ length: 30 }, (_, i) => turn(i)); n.dialogue[28] = { ...n.dialogue[28], edited: { by: 'Alex', at: n.createdAt } };
  const d = buildContext(v, 'reply', a1, { today }).blocks.DIALOGUE_BLOCK;
  expect(d.startsWith('(18 earlier turns omitted)\nDIALOGUE ON THIS NODE:')).toBe(true); expect(d).toContain('Turn 19'); expect(d).not.toContain('Turn 18');
  expect(d).toContain('ASSISTANT (corrected by the user): Turn 29'); expect(d).toContain('USER: Turn 30');
  n.dialogue = n.dialogue.slice(0, 12); expect(buildContext(v, 'reply', a1, { today }).blocks.DIALOGUE_BLOCK).not.toContain('omitted');
  n.dialogue.push(turn(12)); expect(buildContext(v, 'reply', a1, { today }).blocks.DIALOGUE_BLOCK).toContain('(1 earlier turn omitted)');
  expect(buildContext(v, 'check', a1, { today, turn: 2 }).blocks.DIALOGUE_BLOCK).toBe('TURN TO CHECK (ASSISTANT):\nTurn 3');
  expect(buildContext(v, 'check', a1, { today }).blocks).not.toHaveProperty('DIALOGUE_BLOCK');
});

test('CA-31/32: correction clips and edited ancestors, with the user words', () => {
  const { v, root, concept } = board(), sub = addChooseChild(v, concept, { title: 'Fumes', kind: 'concept', createdBy: 'model' }).id;
  v.nodes[concept].content = 'x'.repeat(5000);
  expect(buildContext(v, 'light', sub, { today }).blocks.PARENT_BLOCK).toContain('x'.repeat(2500) + '…');
  v.nodes[concept].edited = { by: 'Alex', at: v.nodes[concept].createdAt };
  const parent = buildContext(v, 'light', sub, { today }).blocks.PARENT_BLOCK;
  expect(parent).toContain('x'.repeat(5000)); expect(parent).toContain('(corrected by the user)');
  v.nodes[root].content = 'Corrected root'; v.nodes[root].edited = v.nodes[concept].edited;
  expect(buildContext(v, 'light', sub, { today }).blocks.PARENT_BLOCK).toContain('USER CORRECTIONS ON EARLIER NODES OF THE PATH:');
});

test('CP-50: needs block in every call, the note and each answered need and open need', () => {
  const t = board();
  const needs = buildContext(t.v, 'intro', t.root, { today }).blocks.NEEDS_BLOCK;
  expect(needs).toBe(`IN THE USER'S WORDS:\nbudget about 500 €\nANSWERED NEEDS:\n- ${t.need} What will you print?: figurines for my kids\nSTILL OPEN:\n- ${t.open} Where will it stand?`);
  for (const task of ['intro', 'light', 'more', 'reply', 'find', 'fill', 'check', 'recommend'] as const) expect(buildContext(t.v, task, task === 'fill' ? t.a1 : t.family, { today }).blocks.NEEDS_BLOCK).toBe(needs);
  setState(t.v, t.open, 'dismissed'); expect(buildContext(t.v, 'intro', t.root, { today }).blocks.NEEDS_BLOCK).not.toContain('STILL OPEN');
});

test('CP-53: an empty needs list reads NEEDS: none yet; a note alone is the note', () => {
  const { v, root } = printer(''), { v: noted } = printer('only a note');
  expect(buildContext(v, 'intro', root, { today }).blocks.NEEDS_BLOCK).toBe('NEEDS: none yet');
  expect(buildContext(noted, 'light', noted.rootId, { today }).blocks.NEEDS_BLOCK).toBe("IN THE USER'S WORDS:\nonly a note");
  setNeedsNote(v, 'later'); expect(buildContext(v, 'intro', root, { today }).blocks.NEEDS_BLOCK).toBe("IN THE USER'S WORDS:\nlater");
});

test('CP-50: board groups, chosen mark, rejected reason and status; none in intro', () => {
  const t = board(), b = buildContext(t.v, 'light', t.root, { today }).blocks.BOARD_BLOCK;
  expect(b).toContain(`MUST:\n- ${t.volume} Build volume — size of parts`); expect(b).toContain(`NICE:\n- ${t.noise} Noise — quiet room`);
  expect(b).toContain(`TO RANK:\n- ${t.price} Price`); expect(b).toContain(`IRRELEVANT:\n- ${t.skip} Warranty`);
  expect(b).toContain(`SHORTLIST:\n- ${t.a1} Bambu A1\n- ${t.p1s} Prusa MK4`); expect(b).toContain(`REJECTED:\n- ${t.old} Ender 3 — too slow`); expect(b.endsWith('STATUS: exploring')).toBe(true);
  t.v.nodes[t.a1].state = 'chosen'; expect(buildContext(t.v, 'light', t.root, { today }).blocks.BOARD_BLOCK).toContain(`- ${t.a1} Bambu A1 [chosen]`);
  expect(buildContext(t.v, 'intro', t.root, { today }).blocks).not.toHaveProperty('BOARD_BLOCK');
});

test('CP-51: exact blocks per task', () => {
  const t = board(), f = t.family, p = t.a1; t.v.nodes[f].content = 'Closed printers'; t.v.nodes[p].content = 'A1 text'; t.v.nodes[t.root].content = 'Subject text';
  t.v.nodes[p].dialogue = [{ role: 'user', text: 'Hi', at: t.v.nodes[p].createdAt, author: { kind: 'user', by: 'Alex' } }]; t.v.nodes[p].data = { cells: { [t.volume]: cell('256 mm') } };
  const base = ['SUBJECT_BLOCK', 'LOCALE_BLOCK', 'NEEDS_BLOCK'], withBoard = [...base, 'BOARD_BLOCK'], map = [...withBoard, 'PATH_BLOCK', 'MAP_BLOCK'];
  expect(keys(t.v, 'intro', t.root)).toEqual(base);
  expect(keys(t.v, 'light', f)).toEqual([...map, 'PARENT_BLOCK']);
  expect(keys(t.v, 'find', f)).toEqual([...map, 'PARENT_BLOCK']);
  expect(keys(t.v, 'find', t.root)).toEqual([...map, 'FOCUS_BLOCK']);
  expect(keys(t.v, 'more', f)).toEqual([...map, 'FOCUS_BLOCK', 'EXISTING_CHILDREN']);
  expect(keys(t.v, 'reply', p)).toEqual([...map, 'PARENT_BLOCK', 'FOCUS_BLOCK', 'DIALOGUE_BLOCK', 'COMPARE_BLOCK']);
  expect(keys(t.v, 'reply', t.concept)).not.toContain('COMPARE_BLOCK'); expect(keys(t.v, 'reply', t.root)).toContain('COMPARE_BLOCK');
  expect(keys(t.v, 'fill', p)).toEqual([...withBoard, 'COMPARE_BLOCK', 'TARGET']);
  expect(keys(t.v, 'check', p)).toEqual([...map, 'FOCUS_BLOCK', 'COMPARE_BLOCK']); expect(keys(t.v, 'check', t.concept)).not.toContain('COMPARE_BLOCK');
  expect(keys(t.v, 'recommend', t.root)).toEqual([...map, 'COMPARE_BLOCK']);
});

test('CP-50: Compare lines show sources, the user value beside the room value, disagreement and nothing found', () => {
  const t = board(), a = t.v.nodes[t.a1], p = t.v.nodes[t.p1s];
  a.data = { cells: { [t.volume]: cell('256 mm', { sources: [{ kind: 'manufacturer', name: 'M', read: '2026-10-01' }, { kind: 'measured', name: 'R', read: '2026-09-20' }] }), [t.noise]: cell('48 dB', { disagree: true, user: { value: '40 dB', at: '2026-10-15T10:00:00.000Z', by: 'Alex' } }) } };
  p.data = { cells: { [t.volume]: cell(null, { sources: [] }), [t.noise]: cell('55 dB', { disagree: true }), [t.price]: cell('999') } };
  const c = buildContext(t.v, 'recommend', t.root, { today }).blocks.COMPARE_BLOCK.split('\n');
  expect(c[0]).toContain('COMPARE'); expect(c).toContain(`${t.a1} × ${t.volume}: 256 mm [manufacturer+measured, 2026-09-20]`);
  expect(c).toContain(`${t.a1} × ${t.noise}: 40 dB (the user's value); the room's value: ≠ 48 dB [manufacturer, 2026-10-01]`);
  expect(c).toContain(`${t.p1s} × ${t.volume}: nothing found`); expect(c).toContain(`${t.p1s} × ${t.noise}: ≠ 55 dB [manufacturer, 2026-10-01]`);
  expect(c.join('\n')).not.toContain(t.price); expect(c).toHaveLength(5);
  const cand = t.v.nodes[t.cand]; cand.data = { cells: { [t.volume]: cell('x') } }; expect(buildContext(t.v, 'recommend', t.root, { today }).blocks.COMPARE_BLOCK).not.toContain(t.cand);
  a.data = { cells: { [t.volume]: cell('y'.repeat(160), { user: { value: 'z'.repeat(160), at: '2026-10-15T10:00:00.000Z', by: 'Alex' } }) } };
  for (const line of buildContext(t.v, 'recommend', t.root, { today }).blocks.COMPARE_BLOCK.split('\n').slice(1)) expect(line.length).toBeLessThanOrEqual(300);
});

test('CP-50, CP-40: TARGET lists the empty cells of the focus column or row, or an explicit list', () => {
  const t = board(); t.v.nodes[t.a1].data = { cells: { [t.volume]: cell('256 mm') } };
  expect(fillTarget(t.v, t.a1)).toEqual([{ productId: t.a1, criterionId: t.noise }]);
  expect(fillTarget(t.v, t.volume)).toEqual([{ productId: t.p1s, criterionId: t.volume }]);
  expect(fillTarget(t.v, t.root)).toHaveLength(3);
  expect(buildContext(t.v, 'fill', t.volume, { today }).blocks.TARGET).toBe(`TARGET (the cells to fill, exactly these):\n${t.p1s} × ${t.volume} (Build volume)`);
  expect(buildContext(t.v, 'fill', t.a1, { today, target: [{ productId: t.a1, criterionId: t.volume }] }).blocks.TARGET).toContain(`${t.a1} × ${t.volume} (Build volume)`);
});

test('CP-50: the focus block of a product carries its facts', () => {
  const t = board(); t.v.nodes[t.a1].data = { facts: [{ label: 'Price', value: '399 €', sources: [{ kind: 'shop', name: 'Bambu', read: '2026-10-10' }] }] };
  expect(buildContext(t.v, 'reply', t.a1, { today }).blocks.FOCUS_BLOCK).toContain('- Price: 399 € [shop, 2026-10-10]');
});

test('CP-53/CA-50: today changes only LOCALE_BLOCK, a board change never changes the map part, builds are deterministic', () => {
  const t = board(), one = buildContext(t.v, 'reply', t.a1, { today }), other = buildContext(t.v, 'reply', t.a1, { today: '2027-01-02' });
  expect(one.blocks.LOCALE_BLOCK).toBe("USER'S COUNTRY: FR · CURRENCY: EUR · TODAY: 2026-10-15");
  expect({ ...other.blocks, LOCALE_BLOCK: '' }).toEqual({ ...one.blocks, LOCALE_BLOCK: '' }); expect(other.stats).toEqual(one.stats);
  const before = buildContext(t.v, 'light', t.family, { today }), copy = structuredClone(t.v); copy.nodes = Object.fromEntries(Object.entries(t.v.nodes).reverse());
  expect(buildContext(copy, 'light', t.family, { today })).toEqual(before);
  setNeedsNote(t.v, 'different note'); answerNeed(t.v, t.need, 'something else', 'Alex'); t.v.nodes[t.p1s].data = { cells: { [t.volume]: cell('1') } }; t.v.nodes[t.old].data = { rejected: { reason: 'another reason', at: '2026-10-15T10:00:00.000Z' } };
  const after = buildContext(t.v, 'light', t.family, { today });
  for (const k of ['MAP_BLOCK', 'PATH_BLOCK', 'PARENT_BLOCK', 'SUBJECT_BLOCK']) expect(after.blocks[k]).toBe(before.blocks[k]);
  expect(after.stats).toEqual(before.stats); expect(after.blocks.NEEDS_BLOCK).not.toBe(before.blocks.NEEDS_BLOCK); expect(after.blocks.BOARD_BLOCK).not.toBe(before.blocks.BOARD_BLOCK);
});

test('CP-52: needs, board and Compare are not reduced by the map budget', () => {
  const t = board();
  const small = buildContext(t.v, 'reply', t.a1, { today, budgetTokens: 50 }), full = buildContext(t.v, 'reply', t.a1, { today });
  expect(small.stats.form).toBe('reduced');
  for (const k of ['NEEDS_BLOCK', 'BOARD_BLOCK', 'LOCALE_BLOCK']) expect(small.blocks[k]).toBe(full.blocks[k]);
  expect(() => buildContext(t.v, 'light', t.root, { today, budgetTokens: -1 })).toThrow(); expect(() => buildContext(t.v, 'light', t.root, { today: 'now' })).toThrow();
});
