import { expect, test } from 'vitest';
import { visitSummary } from '../../core/model';
import { addChooseChild, answerNeed, chooseProduct, markBought, newChooseSubject, normalize, rejectProduct, setState, unchooseProduct } from './rules';
import { board, headerStats } from './stats';
import { chooseOf, chooseSummary } from './summary';

const locale = { country: 'FR', currency: 'EUR' };
function subject() {
  const s = newChooseSubject('3D printer', { tone: 'engineer', model: 'opus', effort: 'medium', locale, needsNote: 'budget about 500 €' }, 'Alex');
  const v = s.rooms.choose; setState(v, v.rootId, 'lit');
  const add = (kind: Parameters<typeof addChooseChild>[2]['kind'], title: string) => addChooseChild(v, v.rootId, { title, kind, createdBy: 'model' }).id;
  return { v, add };
}
function board4() {
  const { v, add } = subject();
  const n1 = add('need', 'Use'), add2 = add('need', 'Who'), n3 = add('need', 'Dropped');
  answerNeed(v, n1, 'figurines', 'Alex');
  setState(v, n3, 'dismissed');
  const c1 = add('criterion', 'Volume'), c2 = add('criterion', 'Noise'), c3 = add('criterion', 'Price'), c4 = add('criterion', 'Colour');
  setState(v, c1, 'must'); setState(v, c2, 'nice'); setState(v, c3, 'irrelevant');
  const p1 = add('product', 'Printer A'), p2 = add('product', 'Printer B'), p3 = add('product', 'Printer C'), p4 = add('product', 'Printer D');
  setState(v, p1, 'shortlisted'); setState(v, p2, 'shortlisted'); rejectProduct(v, p4, 'too loud');
  return { v, add2, c4, p1, p2, p3 };
}

test('CR-25: the stats are the header stats, dismissed nodes not counted, shortlisted includes the chosen', () => {
  const { v, p1 } = board4();
  const c = chooseSummary(visitSummary(v)).choose;
  expect(c.stats).toEqual(headerStats(v));
  expect(c.stats).toEqual({ needs: 2, criteria: 4, shortlisted: 2 });
  expect(c.steps).toMatchObject({ needsAnswered: 1, needsTotal: 2, criteriaRanked: 3, criteriaTotal: 4, shortlisted: 2, pick: 'none' });
  expect(c.board).toEqual({ must: 1, nice: 1, toRank: 1, irrelevant: 1, candidates: 1, shortlisted: 2, rejected: 1 });
  chooseProduct(v, p1);
  expect(chooseSummary(visitSummary(v)).choose.stats).toEqual(headerStats(v));
  expect(chooseSummary(visitSummary(v)).choose.stats.shortlisted).toBe(2);
});

test('CR-24: status, pick and history follow choose, un-choose and bought', () => {
  const { v, p1, p2 } = board4();
  let c = chooseOf({ id: 'x', title: 'x', path: 'x', rooms: { choose: visitSummary(v) } })!;
  expect(c).toMatchObject({ status: 'exploring', unchosen: false, history: [] }); expect(c.pick).toBeUndefined();
  v.nodes[p1].data = { facts: [{ label: 'Price', value: '549 €', sources: [] }] };
  chooseProduct(v, p1); normalize(v);
  c = chooseSummary(visitSummary(v)).choose;
  expect(c).toMatchObject({ status: 'decided', unchosen: false, pick: { productId: p1, title: 'Printer A', price: '549 €' }, steps: { pick: 'chosen' }, missing: [] });
  expect(c.history.map(h => h.status)).toEqual(['decided']);
  markBought(v); expect(chooseSummary(visitSummary(v)).choose).toMatchObject({ status: 'bought', steps: { pick: 'bought' } });
  // a second choice un-chooses the first; un-choosing returns to exploring with the product kept for the Gallery
  chooseProduct(v, p2); unchooseProduct(v, p2); normalize(v);
  c = chooseSummary(visitSummary(v)).choose;
  expect(c).toMatchObject({ status: 'exploring', unchosen: true, pick: { title: 'Printer B' } });
  expect(c.history.map(h => [h.status, !!h.unchosen])).toEqual([['decided', false], ['bought', false], ['exploring', true], ['decided', false], ['exploring', true]]);
});

test('CR-61: what is missing while exploring, from the summary; ready when nothing is', () => {
  const { v, add2, c4, p3 } = board4();
  const c = chooseSummary(visitSummary(v)).choose;
  expect(c.missing).toEqual(['1 need to answer', '1 criterion to rank']);
  expect(c.ready).toBe(false);
  expect(board(v).missing.needs).toHaveLength(1); expect(board(v).missing.toRank).toHaveLength(1);
  answerNeed(v, add2, 'kids', 'Alex'); setState(v, c4, 'nice');
  expect(chooseSummary(visitSummary(v)).choose).toMatchObject({ missing: [], ready: true });
});

test('a new subject has nothing settled; figures come through for the card', () => {
  const { v } = subject();
  const s = chooseSummary(visitSummary(v));
  expect(s.choose).toMatchObject({ status: 'exploring', steps: { needsTotal: 0, criteriaTotal: 0, shortlisted: 0, pick: 'none' }, missing: ['a must criterion', 'two products to shortlist'] });
  expect(s).toMatchObject({ tone: 'engineer', total: 1, generations: 0, tokens: 0, mainModel: null });
});

test('a summary without history or pick (left out by ST-7 when over 4 KB) still reads', () => {
  const sum = visitSummary(subject().v); delete sum.data.history; delete sum.data.pick; delete sum.data.status;
  expect(chooseSummary(sum).choose).toMatchObject({ status: 'exploring', history: [], unchosen: false });
});
