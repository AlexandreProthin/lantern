import { expect, test } from 'vitest';
import { addChooseChild, newChooseSubject } from '../rules';
import type { Cell } from '../rules';
import { clickAll, clickCell, clickRow, columnsOf, day, keepOpen, nothingOpen, priceDate, rowSummary, rowsOf } from './model';

function board() {
  const s = newChooseSubject('3D printer', { tone: 'curious', model: 'opus', effort: 'medium', locale: { country: 'FR', currency: 'EUR' } }, 'Alex'), v = s.rooms.choose;
  v.nodes[v.rootId].state = 'lit';
  const add = (kind: 'criterion' | 'product', title: string, state: string) => { const n = addChooseChild(v, v.rootId, { title, kind, createdBy: 'user' }); n.state = state; return n; };
  return { v, a: add('product', 'A', 'shortlisted'), b: add('product', 'B', 'chosen'), c: add('product', 'C', 'candidate'), vol: add('criterion', 'Volume', 'must'), noise: add('criterion', 'Noise', 'irrelevant'), open: add('criterion', 'Open', 'open') };
}
const src = (kind: Cell['sources'][number]['kind'], read = '2026-10-15') => ({ kind, name: kind, read });
const at = '2026-10-15T10:00:00.000Z';

test('CR-50: shortlisted and chosen products are columns; must first, irrelevant behind the toggle, unranked criteria have no row', () => {
  const { v, a, b, vol, noise } = board();
  expect(columnsOf(v).map(n => n.id)).toEqual([a.id, b.id]);
  expect(rowsOf(v, false).map(g => [g.state, g.rows.map(r => r.id)])).toEqual([['must', [vol.id]]]);
  expect(rowsOf(v, true).map(g => g.state)).toEqual(['must', 'irrelevant']); expect(rowsOf(v, true)[1].rows[0].id).toBe(noise.id);
});
test('CR-51: the row summary counts used sources by kind, then disagreements, nothing found and edits', () => {
  const { v, a, b, vol } = board();
  a.data = { cells: { [vol.id]: { value: '256 mm', sources: [src('manufacturer'), src('sponsored')], generationId: 'g', at } satisfies Cell } };
  b.data = { cells: { [vol.id]: { value: '250', disagree: true, sources: [src('measured'), src('measured')], generationId: 'g', at } satisfies Cell } };
  expect(rowSummary([a, b], vol.id, new Set())).toBe('1 manufacturer · 2 measured · ≠ 1');
  b.data = { cells: { [vol.id]: { value: null, sources: [], generationId: 'g', at } } };
  expect(rowSummary([a, b], vol.id, new Set())).toBe('1 manufacturer · ? 1');
  expect(rowSummary([a, b], vol.id, new Set([`${b.id}×${vol.id}`]))).toBe('1 manufacturer · ? 1 · … 1');
  expect(rowSummary([{ ...a, data: {} }], vol.id, new Set())).toBe('no sources yet');
});
test('dates: a read day, a model month, the price date is the latest used source', () => {
  expect(day('2026-10-05')).toBe('5 Oct'); expect(day('2026-03')).toBe('Mar 2026');
  expect(priceDate({ value: '399 €', sources: [src('shop', '2026-10-01'), src('manufacturer', '2026-10-12'), src('sponsored', '2026-10-14')], generationId: 'g', at })).toBe('2026-10-12');
});
test('CR-51 click rules: row, header, cell, and a single card yielding to another criterion', () => {
  const ids = ['r1', 'r2'];
  let o = clickRow(nothingOpen, 'r1'); expect(o).toEqual({ rows: ['r1'], item: null });
  o = clickRow(o, 'r2'); expect(o.rows).toEqual(['r1', 'r2']);
  o = clickRow(o, 'r1'); expect(o.rows).toEqual(['r2']);
  o = clickAll(o, ids); expect(o).toEqual({ rows: ids, item: null }); expect(clickAll(o, ids)).toEqual(nothingOpen);
  o = clickCell(o, 'p:r1'); expect(o).toEqual({ rows: [], item: 'p:r1' });
  expect(clickCell(o, 'p:r1')).toEqual(nothingOpen);
  expect(clickCell(o, 'q:r1')).toEqual({ rows: [], item: 'q:r1' });
  expect(clickRow(o, 'r2')).toEqual({ rows: ['r2'], item: null });
  expect(clickRow(o, 'r1')).toEqual({ rows: ['r1'], item: null });
  expect(clickCell({ rows: ['r1'], item: null }, 'p:r1')).toEqual({ rows: [], item: 'p:r1' });
});
test('open state drops rows and cards that are no longer on the board', () => {
  expect(keepOpen({ rows: ['r1', 'gone'], item: null }, ['r1'], ['p'])).toEqual({ rows: ['r1'], item: null });
  expect(keepOpen({ rows: [], item: 'p:r1' }, ['r1'], ['q'])).toEqual({ rows: [], item: null });
  const same = { rows: ['r1'], item: null }; expect(keepOpen(same, ['r1'], ['p'])).toBe(same);
});
