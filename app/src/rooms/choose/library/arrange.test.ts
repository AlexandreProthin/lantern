import { expect, test } from 'vitest';
import { visitSummary } from '../../../core/model';
import type { SubjectSummary } from '../../../frame/catalogue';
import { addChooseChild, answerNeed, chooseProduct, markBought, newChooseSubject, setState } from '../rules';
import { arrange, counts } from './arrange';

const locale = { country: 'FR', currency: 'EUR' };
function card(title: string, createdAt: string, shape: 'new' | 'almost' | 'decided' | 'bought'): SubjectSummary {
  const s = newChooseSubject(title, { tone: 'curious', model: 'opus', effort: 'medium', locale }, 'Alex'), v = s.rooms.choose;
  setState(v, v.rootId, 'lit');
  const add = (kind: Parameters<typeof addChooseChild>[2]['kind']) => addChooseChild(v, v.rootId, { title: kind + Math.random().toString(36).slice(2, 8), kind, createdBy: 'model' }).id;
  if (shape !== 'new') {
    const n = add('need'), c = add('criterion'), a = add('product'), b = add('product');
    answerNeed(v, n, 'x', 'Alex'); setState(v, c, 'must'); setState(v, a, 'shortlisted');
    if (shape !== 'almost') setState(v, b, 'shortlisted');
    if (shape === 'decided' || shape === 'bought') chooseProduct(v, a);
    if (shape === 'bought') markBought(v);
  }
  return { id: title, title, path: title, createdAt, rooms: { choose: visitSummary(v) } };
}
const cards = [card('Sofa', '2026-10-01T10:00:00Z', 'decided'), card('Printer', '2026-10-02T10:00:00Z', 'bought'), card('Car', '2026-10-03T10:00:00Z', 'new'),
  card('Headphones', '2026-10-04T10:00:00Z', 'almost'), card('Desk', '2026-10-05T10:00:00Z', 'new')];
const opened = { Sofa: '2026-10-14T10:00:00Z', Printer: '2026-10-13T10:00:00Z', Car: '2026-10-12T10:00:00Z', Headphones: '2026-10-15T10:00:00Z' } as Record<string, string>;
const titles = (list: SubjectSummary[]) => list.map(s => s.title);

test('CR-12: tabs count and filter by status', () => {
  expect(counts(cards)).toEqual({ all: 5, exploring: 3, decided: 1, bought: 1 });
  expect(titles(arrange(cards, 'exploring', 'title', false, opened))).toEqual(['Car', 'Desk', 'Headphones']);
  expect(titles(arrange(cards, 'bought', 'title', false, opened))).toEqual(['Printer']);
});

test('CR-12: the five sorts, natural order, a never-opened subject last, reverse flips', () => {
  expect(titles(arrange(cards, 'all', 'lastOpened', false, opened))).toEqual(['Headphones', 'Sofa', 'Printer', 'Car', 'Desk']);
  expect(titles(arrange(cards, 'all', 'created', false, opened))).toEqual(['Desk', 'Headphones', 'Car', 'Printer', 'Sofa']);
  expect(titles(arrange(cards, 'all', 'status', false, opened))).toEqual(['Headphones', 'Car', 'Desk', 'Sofa', 'Printer']);
  expect(titles(arrange(cards, 'all', 'title', false, opened))).toEqual(['Car', 'Desk', 'Headphones', 'Printer', 'Sofa']);
  expect(titles(arrange(cards, 'all', 'title', true, opened))).toEqual(['Sofa', 'Printer', 'Headphones', 'Desk', 'Car']);
});

test('CR-12: closest to a decision puts decided and bought first, then exploring by fewest missing; ties by title', () => {
  expect(titles(arrange(cards, 'all', 'nearest', false, opened))).toEqual(['Printer', 'Sofa', 'Headphones', 'Car', 'Desk']);
});
