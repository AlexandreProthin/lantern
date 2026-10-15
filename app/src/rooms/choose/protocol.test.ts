import { expect, test } from 'vitest';
import { addChooseChild, newChooseSubject, setState, validateChoose } from './rules';
import type { Cell } from './rules';
import { cellEntry, checkSources, factEntry, fresh, inTarget, liveCells, parseReply, placeProducts, recommendedProduct, visibleText } from './protocol';

const today = '2026-10-15', web = { today, web: true }, off = { today, web: false };
const src = (extra: Record<string, unknown> = {}) => ({ kind: 'manufacturer', name: 'Bambu Lab', url: 'https://bambulab.com', read: '2026-10-10', ...extra });
const model = { kind: 'model', name: 'Model knowledge', read: '2026-01' };
const json = (value: unknown) => JSON.stringify(value);
const options = (n = 3) => json(Array.from({ length: n }, (_, i) => ({ title: `Option ${i}`, hook: `Hook ${i}`, kind: 'concept' })));

function printer() {
  const v = newChooseSubject('3D printer', { tone: 'curious', model: 'opus', effort: 'medium', locale: { country: 'FR', currency: 'EUR' } }).rooms.choose;
  setState(v, v.rootId, 'lit');
  const add = (kind: Parameters<typeof addChooseChild>[2]['kind'], title: string, parent = v.rootId) => addChooseChild(v, parent, { title, kind, createdBy: 'model' }).id;
  return { v, root: v.rootId, add };
}

test('CP-32/TP-32: visible text cuts at every block tag and hides half-streamed tags', () => {
  for (const tag of ['options', 'products', 'cells', 'facts', 'need', 'branch', 'recommend']) expect(visibleText(`Prose here.\n<${tag}>[1]</${tag}>`)).toBe('Prose here.');
  expect(visibleText('Prose <opt')).toBe('Prose'); expect(visibleText('Prose <')).toBe('Prose'); expect(visibleText('Prose <recommend')).toBe('Prose'); expect(visibleText('Prose <products')).toBe('Prose');
  expect(visibleText('Use List<T> and a <b>bold</b>')).toBe('Use List<T> and a <b>bold</b>');
  expect(visibleText('Prose\n```json\n<options>[]</options>')).toBe('Prose'); expect(visibleText('Prose\n```json')).toBe('Prose');
  expect(visibleText('  <cells>[]</cells>')).toBe('');
});

test('TP-31/34, CP-30.1: options tolerate fences, unknown kinds and bad entries; first parsing block wins', () => {
  const raw = `Text\n<options>\n\`\`\`json\n${json([{ title: 'A', hook: 'h', kind: 'family' }, { title: 'B', hook: 'h', kind: 'weird' }, { hook: 'no title' }, 5, { title: 'C' }])}\n\`\`\`\n</options>`;
  const r = parseReply(raw, 'light', { ...off, focusKind: 'concept' });
  expect(r.optionsValid).toBe(true); expect(r.options).toEqual([{ title: 'A', hook: 'h', kind: 'family' }, { title: 'B', hook: 'h', kind: 'concept' }, { title: 'C', hook: '', kind: 'concept' }]);
  const two = parseReply(`T <options>not json</options> <options>${options()}</options> <options>[]</options>`, 'intro', off);
  expect(two.options).toHaveLength(3); expect(parseReply('T <options>{"title":"x"}</options>', 'intro', off).optionsValid).toBe(false);
  expect(parseReply('T', 'intro', off).options).toEqual([]);
});

test('TP-30, CP-10: a block the task does not allow is ignored and stripped', () => {
  const all = `Prose <options>${options()}</options><products>[{"title":"P"}]</products><cells>[]</cells><facts>[]</facts><need>{"question":"q","answer":"a"}</need><branch>{"title":"B"}</branch><recommend>{"product":null}</recommend>`;
  const got = (task: Parameters<typeof parseReply>[1]) => { const r = parseReply(all, task, off); return { text: r.text, options: r.options.length, products: r.products.length, need: !!r.need, branch: !!r.branch, recommend: !!r.recommend, cellsValid: r.cellsValid, factsValid: r.factsValid }; };
  expect(got('reply')).toEqual({ text: 'Prose', options: 0, products: 0, need: true, branch: true, recommend: false, cellsValid: false, factsValid: false });
  expect(got('find')).toMatchObject({ options: 0, products: 1, need: false, branch: false });
  expect(got('recommend')).toMatchObject({ options: 0, recommend: true, products: 0 });
  expect(got('check')).toMatchObject({ cellsValid: true, factsValid: true, options: 0 }); expect(got('fill')).toMatchObject({ text: '', cellsValid: true, factsValid: false });
  expect(got('intro')).toMatchObject({ options: 3, branch: false }); expect(got('more')).toMatchObject({ text: '', options: 3 });
  const needOrCriterion = parseReply(all, 'light', { ...off, focusKind: 'criterion' }); expect(needOrCriterion.options).toEqual([]); expect(needOrCriterion.optionsValid).toBe(false);
});

test('TP-35: empty visible text is an error on the prose tasks', () => {
  expect(parseReply(`<options>${options()}</options>`, 'intro', off).emptyError).toBe(true); expect(parseReply('x', 'light', off).emptyError).toBe(false);
  expect(parseReply('', 'reply', off).emptyError).toBe(true); expect(parseReply('', 'check', off).emptyError).toBe(true); expect(parseReply('<recommend>{}</recommend>', 'recommend', off).emptyError).toBe(true);
  expect(parseReply(`<options>${options()}</options>`, 'more', off).emptyError).toBe(false); expect(parseReply('<cells>[]</cells>', 'fill', off).emptyError).toBe(false);
});

test('CP-30.2: products with facts and sources; invalid entries and facts are skipped', () => {
  const raw = `Two products.\n<products>${json([
    { title: 'Bambu A1', hook: 'cheap', family: 'Open bedslingers', facts: [{ label: 'Price', value: '399 €', sources: [src({ kind: 'shop', name: 'Bambu shop' })] }, { label: 'Volume', value: '256 mm', sources: [] }, { label: '', value: 'x', sources: [src()] }] },
    { hook: 'no title' }, { title: 'Prusa MK4', facts: 'none' },
  ])}</products>`;
  const r = parseReply(raw, 'find', web);
  expect(r.productsValid).toBe(true); expect(r.products.map(p => p.title)).toEqual(['Bambu A1', 'Prusa MK4']);
  expect(r.products[0]).toMatchObject({ hook: 'cheap', family: 'Open bedslingers' }); expect(r.products[0].facts).toHaveLength(1); expect(r.products[0].facts[0].label).toBe('Price');
  expect(r.products[1]).toMatchObject({ family: '', facts: [] });
  const many = parseReply(`T<products>${json(Array.from({ length: 15 }, () => ({ title: 'P', facts: Array.from({ length: 20 }, (_, i) => ({ label: `L${i}`, value: 'v', sources: [src()] })) })))}</products>`, 'find', web);
  expect(many.products[0].facts).toHaveLength(12);
});

test('CP-31.1: a source without a valid date is dropped, a value left with none is null', () => {
  for (const bad of [{ read: '15/10/2026' }, { read: 'yesterday' }, { read: undefined }, { kind: 'blog' }, { name: '' }]) expect(checkSources([src(bad)], web).sources).toEqual([]);
  expect(checkSources('nope', web)).toEqual({ sources: [], usable: false });
  expect(cellEntry({ product: 'p', criterion: 'c', value: '256 mm', sources: [src({ read: 'soon' })] }, web)).toMatchObject({ value: null, sources: [] });
  expect(cellEntry({ product: 'p', criterion: 'c', value: '256 mm' }, web)).toMatchObject({ value: null, sources: [] });
  expect(cellEntry({ product: 'p', criterion: 'c', value: '256 mm', sources: [src({ read: 'soon' }), src()] }, web)).toMatchObject({ value: '256 mm', sources: [{ name: 'Bambu Lab' }] });
  expect(factEntry({ label: 'Price', value: '399', sources: [] }, web)).toBeNull();
  expect(checkSources([src({ url: 'http://x.com' })], web).sources[0]).not.toHaveProperty('url');
});

test('CP-31.2: only sponsored sources null the value and keep the sources', () => {
  const sponsored = src({ kind: 'sponsored', name: 'Best of 2026' });
  const only = cellEntry({ product: 'p', criterion: 'c', value: '256 mm', sources: [sponsored] }, web)!;
  expect(only.value).toBeNull(); expect(only.sources).toEqual([sponsored]);
  const mixed = cellEntry({ product: 'p', criterion: 'c', value: '256 mm', sources: [sponsored, src()] }, web)!;
  expect(mixed.value).toBe('256 mm'); expect(mixed.sources).toHaveLength(2);
  expect(factEntry({ label: 'Volume', value: '256', sources: [sponsored] }, web)).toBeNull();
  expect(cellEntry({ product: 'p', criterion: 'c', value: '256 mm', disagree: true, sources: [sponsored] }, web)).not.toHaveProperty('disagree');
});

test('CP-31.3: a read date later than today is invalid; model sources only without the web', () => {
  expect(checkSources([src({ read: '2026-10-16' })], web).sources).toEqual([]); expect(checkSources([src({ read: '2026-10-15' })], web).sources).toHaveLength(1);
  expect(checkSources([model], off).sources).toEqual([model]); expect(checkSources([model], web)).toEqual({ sources: [], usable: false });
  expect(checkSources([{ ...model, read: '2026-11' }], off).sources).toEqual([]); expect(checkSources([{ ...model, read: '2026-10' }], off).sources).toHaveLength(1);
  expect(checkSources([{ ...model, read: '2026-10-01' }], off).sources).toEqual([]); expect(checkSources([{ ...model, url: 'https://x.com' }], off).sources[0]).not.toHaveProperty('url');
  expect(cellEntry({ product: 'p', criterion: 'c', value: '250 mm', sources: [model] }, web)!.value).toBeNull();
  expect(cellEntry({ product: 'p', criterion: 'c', value: '250 mm', sources: [model] }, off)!.value).toBe('250 mm');
});

test('CP-5: cell entries keep null values, notes and disagreement, clip to the stored limits, and validate', () => {
  const sources = [src({ value: '256 mm' }), src({ kind: 'measured', name: 'Review', value: '250 mm', read: '2026-10-01' })];
  const cell = cellEntry({ product: 'p', criterion: 'c', value: '256 mm', note: 'n'.repeat(300), disagree: true, sources }, web)!;
  expect(cell).toMatchObject({ value: '256 mm', disagree: true }); expect([...cell.note!]).toHaveLength(200);
  expect(cellEntry({ product: 'p', criterion: 'c', value: null, note: 'not found', disagree: true, sources: [] }, web)).toEqual({ product: 'p', criterion: 'c', value: null, note: 'not found', sources: [] });
  const long = cellEntry({ product: 'p', criterion: 'c', value: 'é'.repeat(400), sources: [src()] }, web)!; expect([...long.value!]).toHaveLength(160);
  expect(cellEntry({ product: 'p', criterion: 'c', value: 12, sources: [] }, web)).toBeNull(); expect(cellEntry({ criterion: 'c', value: 'x', sources: [src()] }, web)).toBeNull(); expect(cellEntry({ product: 'p', criterion: 'c' }, web)).toBeNull();
  // The stored shape passes validateChoose.
  const { v, add } = printer(), c = add('criterion', 'Volume'), p = add('product', 'A1'); setState(v, c, 'must');
  v.nodes[p].data = { cells: { [c]: { value: cell.value, note: cell.note, disagree: cell.disagree, sources: cell.sources, generationId: 'g', at: '2026-10-15T10:00:00.000Z' } satisfies Cell } };
  expect(() => validateChoose(v)).not.toThrow();
  const r = parseReply(`<cells>${json([{ product: 'p', criterion: 'c', value: '1', sources }])}</cells>`, 'fill', web); expect(r.cells).toHaveLength(1); expect(r.cellsValid).toBe(true);
});

test('CP-30.3: only cells in TARGET survive, first entry per cell; live cells need shortlisted products and must or nice criteria', () => {
  const { v, add } = printer(), c1 = add('criterion', 'Volume'), c2 = add('criterion', 'Noise'), c3 = add('criterion', 'Warranty'), p1 = add('product', 'A1'), p2 = add('product', 'MK4');
  setState(v, c1, 'must'); setState(v, c2, 'nice'); setState(v, c3, 'irrelevant'); setState(v, p1, 'shortlisted');
  const e = (product: string, criterion: string, value = 'x') => cellEntry({ product, criterion, value, sources: [src()] }, web)!;
  const entries = [e(p1, c1, 'a'), e(p1, c1, 'dup'), e(p1, c2), e(p2, c1), e(p1, c3), e('ghost', c1), e(p1, 'ghost')];
  expect(inTarget(entries, [{ productId: p1, criterionId: c1 }, { productId: p2, criterionId: c1 }]).map(x => `${x.product}/${x.criterion}/${x.value}`)).toEqual([`${p1}/${c1}/a`, `${p2}/${c1}/x`]);
  expect(liveCells(v, entries).map(x => `${x.product}/${x.criterion}/${x.value}`)).toEqual([`${p1}/${c1}/a`, `${p1}/${c2}/x`]);
  expect(inTarget(entries, [])).toEqual([]);
});

test('CP-30.1, LR-62: fresh drops titles of any node in any state, duplicates in the batch, and keeps 3', () => {
  const { v, add } = printer(); const d = add('concept', 'Resin'); setState(v, d, 'dismissed'); add('family', 'Enclosed CoreXY');
  const items = ['resin ', 'Enclosed  COREXY', 'Nozzle', 'nozzle', 'Bed', 'Fan', 'Frame'].map(title => ({ title }));
  expect(fresh(v, items).map(i => i.title)).toEqual(['Nozzle', 'Bed', 'Fan']); expect(fresh(v, [{ title: 'Résine' }, { title: 'x' }]).map(i => i.title)).toEqual(['Résine', 'x']);
  expect(fresh(v, [{ title: '3d PRINTER' }])).toEqual([]); expect(fresh(v, items, 1)).toHaveLength(1);
});

test('CP-30.2: placement under a family by id or title, a new family under the subject, or the family in focus', () => {
  const { v, root, add } = printer(); const fam = add('family', 'Open bedslingers'), other = add('family', 'Enclosed'); add('product', 'Existing', fam); add('concept', 'Taken');
  const entry = (title: string, family = '') => ({ title, hook: '', family, facts: [] });
  const place = (entries: ReturnType<typeof entry>[], focus = root) => placeProducts(v, entries, focus).map(p => `${p.product.title}>${p.parentId ?? `new:${p.newFamily}`}`);
  expect(place([entry('A', fam), entry('B', 'open BEDSLINGERS'), entry('C', 'Brand new'), entry('D')])).toEqual([`A>${fam}`, `B>${fam}`, 'C>new:Brand new']);
  expect(place([entry('D'), entry('existing', fam)])).toEqual([`D>${root}`]);
  expect(place([entry('A', other), entry('B', 'whatever'), entry('C', 'x'), entry('D')], fam)).toEqual([`A>${fam}`, `B>${fam}`, `C>${fam}`]);
  expect(place([entry('E', 'Taken')])).toEqual([`E>${root}`]);
  expect(placeProducts(v, [entry('X', 'F'), entry('Y', 'F')], root).map(p => p.newFamily)).toEqual(['F', 'F']);
});

test('TP-31, CP-30.4/.5: need, branch and recommendation', () => {
  const raw = 'Here <need>{"question": "Where will it stand?", "answer": "in the living room"}</need><branch>{"title": "Noise", "hook": "why", "kind": "criterion"}</branch>';
  const r = parseReply(raw, 'reply', off);
  expect(r.need).toEqual({ question: 'Where will it stand?', answer: 'in the living room' }); expect(r.branch).toEqual({ title: 'Noise', hook: 'why', kind: 'criterion' });
  expect(parseReply('x <need>{"question":"q"}</need><branch>{"hook":"x"}</branch>', 'reply', off)).toMatchObject({ need: null, branch: null });
  expect(parseReply('x <need>oops</need><need>{"question":"q","answer":"a"}</need>', 'reply', off).need).toEqual({ question: 'q', answer: 'a' });
  expect([...parseReply(`x <need>${json({ question: 'q', answer: 'a'.repeat(900) })}</need>`, 'reply', off).need!.answer]).toHaveLength(500);
  expect(parseReply('x <branch>{"title":"Z"}</branch>', 'reply', off).branch).toMatchObject({ kind: 'concept' });
  const rec = parseReply('Pick. <recommend>{"product": "p1", "confidence": "high", "missing": ["a", 3, ""]}</recommend>', 'recommend', off).recommend!;
  expect(rec).toEqual({ product: 'p1', confidence: 'high', missing: ['a'] });
  expect(parseReply('x <recommend>{"product": null, "confidence": "sure"}</recommend>', 'recommend', off).recommend).toEqual({ product: null, confidence: 'low', missing: [] });
  expect(parseReply('x <recommend>[1]</recommend>', 'recommend', off).recommend).toBeNull();
  const { v, add } = printer(), p = add('product', 'A1'), q = add('product', 'MK4'); setState(v, p, 'shortlisted');
  expect(recommendedProduct(v, { product: p, confidence: 'high', missing: [] })).toBe(p); expect(recommendedProduct(v, { product: q, confidence: 'high', missing: [] })).toBeNull();
  expect(recommendedProduct(v, { product: 'ghost', confidence: 'low', missing: [] })).toBeNull(); expect(recommendedProduct(v, null)).toBeNull();
  v.nodes[p].state = 'chosen'; expect(recommendedProduct(v, { product: p, confidence: 'low', missing: [] })).toBe(p);
});

test('CP-30.5: facts of a check are validated like products facts', () => {
  const r = parseReply(`Checked.<facts>${json([{ label: 'Price', value: '379 €', sources: [src({ kind: 'shop', name: 'Shop' })] }, { label: 'Noise', value: '48 dB', sources: [src({ kind: 'sponsored', name: 'Ad' })] }, { label: 'x' }])}</facts>`, 'check', web);
  expect(r.factsValid).toBe(true); expect(r.facts.map(f => f.label)).toEqual(['Price']);
});
