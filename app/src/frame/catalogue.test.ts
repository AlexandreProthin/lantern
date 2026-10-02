import { afterEach, describe, expect, it, vi } from 'vitest';
import { cardDetails, Catalogue, modelShares } from './catalogue';
import type { SubjectSummary } from './catalogue';
const card = (id: string, title: string, extra: Partial<SubjectSummary> = {}): SubjectSummary =>
  ({ id, title, path: `/library/subjects/${id}.json`, createdAt: '2026-09-01T12:00:00Z', total: 10, understood: 2, ...extra });
const state = { recents: ['deleted', 'a'], lastOpenedAt: { a: '2026-10-02T11:00:00Z', b: '2026-10-02T14:00:00+02:00' } };
afterEach(() => vi.useRealTimers());
describe('WG library catalogue', () => {
  it('orders recents by app-side instants and never includes removed subjects', () => {
    const catalogue = new Catalogue();
    catalogue.replace([card('a', 'A'), card('b', 'B'), card('c', 'C'), card('d', 'D')], state);
    expect(catalogue.recent.map(s => s.id)).toEqual(['b', 'a', 'c']);
    catalogue.setFilter('D');
    expect(catalogue.recent.map(s => s.id)).toEqual(['b', 'a', 'c']);
    catalogue.dispose();
  });
  it('keeps title ties A to Z in either direction and handles zero-node progress', () => {
    const catalogue = new Catalogue();
    catalogue.replace([card('z', 'Z'), card('a', 'A'), card('b', 'B', { total: 0, understood: 0 })], { recents: [], lastOpenedAt: {} });
    catalogue.setSort('progress');
    expect(catalogue.visible.map(s => s.id)).toEqual(['a', 'z', 'b']);
    catalogue.setSort('progress', true);
    expect(catalogue.visible.map(s => s.id)).toEqual(['b', 'a', 'z']);
    catalogue.setSort('created', true);
    expect(catalogue.visible.map(s => s.id)).toEqual(['a', 'b', 'z']);
  });
  it('debounces typing, removes hidden selection, and immediately clears a pending filter', () => {
    vi.useFakeTimers();
    const catalogue = new Catalogue(); catalogue.replace([card('a', 'Tides'), card('b', 'Optics')], state);
    catalogue.select('a'); catalogue.setFilter('OPT');
    vi.advanceTimersByTime(149); expect(catalogue.visible).toHaveLength(2);
    vi.advanceTimersByTime(1); expect(catalogue.visible.map(s => s.id)).toEqual(['b']); expect(catalogue.selectedId).toBeNull();
    catalogue.setFilter('no match'); catalogue.setFilter(''); vi.advanceTimersByTime(150);
    expect(catalogue.visible).toHaveLength(2);
    catalogue.setFilter('Tides'); catalogue.dispose(); vi.advanceTimersByTime(150);
    expect(catalogue.appliedFilter).toBe('');
  });
  it('moves through grid rows without horizontal wrap and reconciles deleted selections', () => {
    const catalogue = new Catalogue();
    const cards = ['a', 'b', 'c', 'd', 'e'].map(id => card(id, id));
    const emptyState = { recents: [], lastOpenedAt: {} }; catalogue.replace(cards, emptyState);
    catalogue.move('Home', 3); catalogue.move('ArrowLeft', 3); expect(catalogue.selectedId).toBe('a');
    catalogue.move('ArrowDown', 3); expect(catalogue.selectedId).toBe('d');
    catalogue.move('ArrowRight', 3); expect(catalogue.selectedId).toBe('e');
    catalogue.move('ArrowUp', 3); expect(catalogue.selectedId).toBe('b');
    catalogue.move('ArrowRight', 3); catalogue.move('ArrowRight', 3); expect(catalogue.selectedId).toBe('c');
    catalogue.move('End', 3); expect(catalogue.selectedId).toBe('e');
    catalogue.replace(cards.slice(0, 4), emptyState); expect(catalogue.selectedId).toBeNull();
    catalogue.move('End', 3); expect(catalogue.selectedId).toBe('d');
    catalogue.move('Escape', 3); expect(catalogue.selectedId).toBeNull();
    expect(new Catalogue().selectedId).toBeNull();
  });
  it('renders detailed stats from summaries, rounds shares to 100, and strips all token fields', () => {
    const summary = card('a', 'A', { tone: 'curious', generations: 3, mainModel: 'c',
      modelOutputs: { a: 1, b: 1, c: 1 }, input: 20, output: 3, tokens: 23 });
    expect(modelShares(summary)).toEqual([{ model: 'c', output: 1, share: 34 }, { model: 'a', output: 1, share: 33 }, { model: 'b', output: 1, share: 33 }]);
    const visible = cardDetails(summary, state.lastOpenedAt.a, true);
    expect(visible.tokens).toBe(23); expect(visible.lastOpenedAt).toBe(state.lastOpenedAt.a);
    const hidden = cardDetails(summary, undefined, false);
    expect(hidden).not.toHaveProperty('tokens'); expect(hidden).not.toHaveProperty('input'); expect(hidden).not.toHaveProperty('output');
    expect(hidden.models).toEqual([{ model: 'c' }, { model: 'a' }, { model: 'b' }]);
    expect(hidden).toMatchObject({ tone: 'curious', generations: 3 });
    expect(modelShares(card('z', 'Zero', { modelOutputs: { a: 0 } }))[0].share).toBeNull();
    expect(cardDetails(card('broken', 'Broken', { unreadable: true }), undefined, true).unreadable).toBe(true);
  });
});
