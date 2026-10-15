import { expect, test } from 'vitest';
import { cloneJson } from '../../core/model';
import type { RoomVisit } from '../../core/model';
import { addChooseChild, answerNeed, cellStatus, chooseProduct, chosenOf, markBought, newChooseSubject, pruneCells, rejectProduct,
  normalize, restoreProduct, setNeedsNote, setPriceCriterion, setState, statusOf, unchooseProduct, validateChoose } from './rules';
import type { Cell } from './rules';
import { board, headerStats } from './stats';
import { chooseSettingsDefaults, currencyOf, systemCountry, validateChooseSettings } from './settings';

const locale = { country: 'FR', currency: 'EUR' };
function printer() {
  const s = newChooseSubject('3D printer', { tone: 'curious', model: 'opus', effort: 'medium', locale, needsNote: 'budget about 500 €' }, 'Alex');
  const v = s.rooms.choose, root = v.rootId;
  setState(v, root, 'lit');
  const add = (kind: Parameters<typeof addChooseChild>[2]['kind'], title: string, parent = root) => addChooseChild(v, parent, { title, kind, createdBy: 'model' }).id;
  return { s, v, root, add };
}
const cell = (value: string | null, extra: Partial<Cell> = {}): Cell => ({ value, sources: [{ kind: 'manufacturer', name: 'Bambu Lab', url: 'https://bambulab.com', read: '2026-10-15' }], generationId: 'g1', at: '2026-10-15T10:00:00.000Z', ...extra });

test('CP-1/CP-2: a new subject is exploring, with locale, tone and the needs note, and validates', () => {
  const { s, v } = printer();
  expect(v.data).toMatchObject({ tone: 'curious', locale, status: 'exploring', history: [], needsNote: 'budget about 500 €' });
  expect(() => validateChoose(v)).not.toThrow();
  setNeedsNote(v, '  '); expect(v.data?.needsNote).toBeUndefined();
  expect(() => newChooseSubject('x', { tone: 'curious', model: 'opus', effort: 'low', locale: { country: 'France', currency: 'EUR' } })).toThrow();
  expect(s.rooms.choose.nodes[v.rootId].kind).toBe('subject');
});

test('CR-21/CR-23: states per kind, ranking any time, dismissal only from open', () => {
  const { v, add } = printer();
  const need = add('need', 'What will you print?'), crit = add('criterion', 'Build volume'), product = add('product', 'Bambu A1');
  expect(v.nodes[product].state).toBe('candidate');
  setState(v, crit, 'must'); setState(v, crit, 'irrelevant'); setState(v, crit, 'nice');
  expect(() => setState(v, crit, 'open')).toThrow(); expect(() => setState(v, crit, 'dismissed')).toThrow();
  expect(() => setState(v, need, 'answered')).toThrow();
  answerNeed(v, need, ' figurines for my kids ', 'Alex'); expect(v.nodes[need].data?.answer).toMatchObject({ text: 'figurines for my kids', by: 'Alex' });
  answerNeed(v, need, 'figurines', 'Alex'); expect(v.nodes[need].state).toBe('answered');
  expect(() => setState(v, product, 'dismissed')).toThrow();
  const concept = add('concept', 'Heated bed'); setState(v, concept, 'dismissed'); setState(v, concept, 'open'); setState(v, concept, 'lit');
  expect(() => addChooseChild(v, need, { title: 'Child', kind: 'concept', createdBy: 'model' })).toThrow();
  expect(() => validateChoose(v)).not.toThrow();
});

test('CR-22/CR-24/CP-2: one pick, status and append-only history, un-choosing included', () => {
  const { v, add } = printer();
  const a = add('product', 'Bambu A1'), b = add('product', 'Prusa MK4S');
  setState(v, a, 'shortlisted'); setState(v, b, 'shortlisted');
  chooseProduct(v, a); expect(statusOf(v)).toBe('decided'); expect(v.nodes[b].state).toBe('shortlisted');
  chooseProduct(v, b); expect(chosenOf(v)?.id).toBe(b); expect(v.nodes[a].state).toBe('shortlisted');
  markBought(v); expect(statusOf(v)).toBe('bought');
  unchooseProduct(v, b); expect(statusOf(v)).toBe('exploring');
  expect((v.data?.history as { status: string; productId: string; unchosen?: true }[]).map(h => [h.status, h.productId, h.unchosen ?? false])).toEqual([
    ['decided', a, false], ['exploring', a, true], ['decided', b, false], ['bought', b, false], ['exploring', b, true]]);
  expect(() => markBought(v)).toThrow();
  expect(v.data?.pick).toMatchObject({ productId: b, title: 'Prusa MK4S' });
  v.nodes[b].data = { facts: [{ label: 'Price', value: '799 €', sources: [] }] }; setState(v, b, 'candidate'); chooseProduct(v, b);
  v.nodes[b].title = 'Prusa MK4S kit'; normalize(v); expect(v.data?.pick).toMatchObject({ title: 'Prusa MK4S kit', price: '799 €' });
  expect(() => validateChoose(v)).not.toThrow();
});

test('CP-3/CP-7: rejection needs a reason; validation refuses broken Choose files', () => {
  const { v, add } = printer();
  const a = add('product', 'Bambu A1'), b = add('product', 'Prusa MK4S'), c1 = add('criterion', 'Price'), c2 = add('criterion', 'Noise');
  expect(() => rejectProduct(v, a, ' ')).toThrow();
  rejectProduct(v, a, 'Too loud for the flat'); expect(v.nodes[a].data?.rejected).toMatchObject({ reason: 'Too loud for the flat' });
  restoreProduct(v, a); expect(v.nodes[a].state).toBe('candidate'); expect(v.nodes[a].data).toBeUndefined();
  setPriceCriterion(v, c1); setPriceCriterion(v, c2); expect(v.nodes[c1].data).toBeUndefined(); expect(v.nodes[c2].data?.measure).toBe('price');
  const broken = (change: (w: RoomVisit) => void) => { const w = cloneJson(v); change(w); return () => validateChoose(w); };
  expect(broken(w => { w.nodes[a].state = 'chosen'; w.nodes[b].state = 'chosen'; w.data = { ...w.data, status: 'decided' }; })).toThrow();
  expect(broken(w => { w.nodes[a].state = 'chosen'; })).toThrow();
  expect(broken(w => { w.nodes[a].state = 'rejected'; })).toThrow();
  expect(broken(w => { w.nodes[c1].data = { measure: 'price' }; })).toThrow();
  expect(broken(w => { w.nodes[a].state = 'lit'; })).toThrow();
  expect(broken(w => { w.data = { ...w.data, locale: { country: 'fr', currency: 'EUR' } }; })).toThrow();
  expect(broken(w => { w.nodes[a].data = { cells: { [c1]: cell('300 €', { sources: [{ kind: 'model', name: 'Opus', read: '2026-10-15' }] }) } }; })).toThrow();
  expect(broken(w => { w.nodes[a].data = { cells: { [c1]: cell('300 €', { sources: [{ kind: 'model', name: 'Opus 5.5', read: '2026-01' }] }) } }; })).not.toThrow();
  expect(broken(w => { w.log.push({ id: 'g', nodeId: w.rootId, task: 'find', model: 'm', effort: 'medium', promptVersion: 'choose-1', startedAt: '2026-10-15T10:00:00.000Z', durationMs: 1, usage: { input: 0, output: 0, thinking: 0, cacheRead: 0, cacheWrite: 0 }, outcome: 'ok', data: { tone: 'curious' } }); })).toThrow();
});

test('CP-5: cell status is derived, and cells of a deleted criterion are dropped', () => {
  const { v, add } = printer();
  const p = add('product', 'Bambu A1'), c = add('criterion', 'Noise');
  expect([cellStatus(undefined), cellStatus(cell('48 dB')), cellStatus(cell(null)), cellStatus(cell('48 dB', { disagree: true })),
    cellStatus(cell('48 dB', { user: { value: '45 dB', at: '2026-10-15T10:00:00.000Z', by: 'Alex' } }))]).toEqual(['empty', 'ok', 'none', 'disagree', 'edited']);
  v.nodes[p].data = { cells: { [c]: cell('48 dB'), gone: cell('x') } }; pruneCells(v);
  expect(Object.keys(v.nodes[p].data?.cells as object)).toEqual([c]);
});

test('CR-61/CR-25: the board counts and its completeness rule', () => {
  const { v, add } = printer();
  const need = add('need', 'Budget?'), must = add('criterion', 'Build volume'), open = add('criterion', 'Noise');
  const a = add('product', 'Bambu A1'), b = add('product', 'Prusa MK4S');
  let s = board(v);
  expect(s).toMatchObject({ needsAnswered: 0, needsTotal: 1, toRank: 2, shortlisted: 0, complete: false });
  expect(s.missing).toMatchObject({ needs: [need], mustCriterion: true, shortlist: true });
  answerNeed(v, need, '500 €', 'Alex'); setState(v, must, 'must'); setState(v, open, 'irrelevant');
  setState(v, a, 'shortlisted'); setState(v, b, 'shortlisted');
  s = board(v); expect(s.missing.cells).toEqual([{ productId: a, criterionId: must }, { productId: b, criterionId: must }]);
  v.nodes[a].data = { cells: { [must]: cell('256 mm') } }; v.nodes[b].data = { cells: { [must]: cell(null) } };
  s = board(v); expect(s.complete).toBe(true); expect(s.missingCount).toBe(0);
  expect(headerStats(v)).toEqual({ needs: 1, criteria: 2, shortlisted: 2 });
});

test('CR-90: settings default to the system region and fall back value by value', () => {
  expect(systemCountry(['fr-FR', 'en-US'])).toBe('FR'); expect(systemCountry(['en'])).toBe('FR'); expect(systemCountry(['de-CH'])).toBe('CH');
  expect(currencyOf('CH')).toBe('CHF'); expect(chooseSettingsDefaults('GB')).toEqual({ country: 'GB', currency: 'GBP', defaultTone: 'curious', useWeb: true });
  const out = validateChooseSettings({ country: 'US', currency: 'dollars', defaultTone: 'loud', useWeb: 'yes', extra: 1 });
  expect(out).toMatchObject({ country: 'US', currency: 'USD', defaultTone: 'curious', useWeb: true, extra: 1 });
});
