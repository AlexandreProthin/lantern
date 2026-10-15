import { expect, test } from 'vitest';
import { newChooseSubject, addChooseChild, setState, chooseProduct } from '../rules';
import { nodeActions } from './actions';

const settings = { tone: 'curious' as const, model: 'm', effort: 'medium' as const, locale: { country: 'FR', currency: 'EUR' } };
const ids = (v: ReturnType<typeof setup>['v'], id: string, running: { nodeId: string } | null = null, web = true) => nodeActions(v, v.nodes[id], running, web).map(a => a.id);
function setup() {
  const v = newChooseSubject('Printer', settings).rooms.choose, add = (kind: 'need' | 'criterion' | 'product' | 'concept' | 'family', parent = v.rootId) => addChooseChild(v, parent, { title: `${kind} ${Object.keys(v.nodes).length}`, kind, createdBy: 'model' });
  return { v, add };
}
test('CP-10: the subject lights, then finds, then offers more', () => {
  const { v } = setup(); expect(ids(v, v.rootId)).toEqual(['light', 'own']);
  v.nodes[v.rootId].state = 'lit'; expect(ids(v, v.rootId)).toEqual(['find', 'more', 'own']);
});
test('CR-21: a product shows the actions of its state, a rejected one can be restored, nothing deletes the pick', () => {
  const { v, add } = setup(), p = add('product');
  expect(ids(v, p.id, null, false)).toEqual(['shortlist', 'reject', 'delete']);
  setState(v, p.id, 'shortlisted'); expect(ids(v, p.id)).toEqual(['choose', 'remove', 'reject', 'check', 'delete']);
  chooseProduct(v, p.id); expect(ids(v, p.id).includes('bought')).toBe(true);
  expect(nodeActions(v, v.nodes[p.id], null).find(a => a.id === 'delete')!.disabled).toBe(true);
});
test('criteria rank and explain; a running call disables the task actions; check follows Use the web', () => {
  const { v, add } = setup(), c = add('criterion');
  expect(ids(v, c.id)).toEqual(['explain', 'must', 'nice', 'irrelevant', 'dismiss', 'check', 'delete']);
  expect(ids(v, c.id, null, false)).not.toContain('check');
  expect(nodeActions(v, v.nodes[c.id], { nodeId: 'x' }).find(a => a.id === 'explain')!.disabled).toBe(true);
});
test('a concept lights, can be dismissed, and a dismissed one is restored', () => {
  const { v, add } = setup(), c = add('concept');
  expect(ids(v, c.id)).toEqual(['light', 'dismiss', 'delete']);
  setState(v, c.id, 'dismissed'); expect(ids(v, c.id)).toEqual(['restore', 'delete']);
});
