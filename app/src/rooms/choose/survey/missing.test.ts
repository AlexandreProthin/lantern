import { expect, test } from 'vitest';
import { newChooseSubject, addChooseChild, setState, answerNeed, chooseProduct } from '../rules';
import { board } from '../stats';
import { missingItems, stageOf } from './missing';

const settings = { tone: 'curious' as const, model: 'm', effort: 'medium' as const, locale: { country: 'FR', currency: 'EUR' } };
function fresh() {
  const v = newChooseSubject('Printer', settings).rooms.choose, kid = (kind: 'need' | 'criterion' | 'product', title: string, parent = v.rootId) => addChooseChild(v, parent, { title, kind, createdBy: 'model' });
  return { v, kid };
}
test('CR-61: nothing settled lists the shortlist; the count matches the board', () => {
  const { v } = fresh(); expect(missingItems(v).map(m => m.text)).toEqual(['No criteria yet', 'Shortlist at least 2 products']);
  expect(missingItems(v).length).toBe(board(v).missingCount);
  expect(stageOf(v)).toBe('exploring');
});
test('missing items follow the recipe order and name the nodes', () => {
  const { v, kid } = fresh(); const need = kid('need', 'Budget?'), crit = kid('criterion', 'Noise'), a = kid('product', 'A'), b = kid('product', 'B');
  expect(missingItems(v).map(m => m.text)).toEqual(['Answer: Budget?', 'Mark at least one criterion as must', 'Rank: Noise', 'Shortlist at least 2 products']);
  answerNeed(v, need.id, 'about 500', 'me'); setState(v, crit.id, 'must'); setState(v, a.id, 'shortlisted');
  expect(missingItems(v).map(m => m.text)).toEqual(['Shortlist one more product', '1 Compare cell still empty']);
  setState(v, b.id, 'shortlisted'); expect(missingItems(v).map(m => m.text)).toEqual(['2 Compare cells still empty']);
  chooseProduct(v, a.id); expect(stageOf(v)).toBe('decided');
});
