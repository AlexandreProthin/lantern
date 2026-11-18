import { expect, test } from 'vitest';
import { treeShape, linkLength, chargeOf } from './cluster';
import { graphMotion } from './graphMotion';

const node = (id: string, parent?: string) => ({ id, parents: parent ? [parent] : [] });

test('GV-15: depths and branch sizes from the first parents, in one pass, cycles cut', () => {
  const s = treeShape([node('l2', 'm1'), node('root'), node('m1', 'root'), node('l1', 'm1'), node('m2', 'root'), node('x', 'y'), node('y', 'x'), node('stray', 'gone')]);
  expect(s.depth.get('root')).toBe(0);
  expect(s.depth.get('m1')).toBe(1);
  expect(s.depth.get('l1')).toBe(2);
  expect(s.depth.get('l2')).toBe(2);
  expect(s.depth.get('stray')).toBe(0);
  expect(s.descendants.get('root')).toBe(4);
  expect(s.descendants.get('m1')).toBe(2);
  expect(s.descendants.get('l1')).toBe(0);
  expect(s.maxDepth).toBe(2);
  // A cycle has depths and does not count itself.
  expect(s.depth.has('x') && s.depth.has('y')).toBe(true);
  expect(s.descendants.get('x')! + s.descendants.get('y')!).toBeLessThanOrEqual(1);
});

test('GV-15: links to the modules are longer than links inside them; a big branch gets a longer link', () => {
  expect(linkLength(1, 12)).toBeGreaterThan(linkLength(2, 0) * 3);
  expect(linkLength(2, 0)).toBe(graphMotion.cluster.inner);
  expect(linkLength(3, 30)).toBeGreaterThan(linkLength(3, 3));
  expect(chargeOf(1, 12)).toBeLessThan(chargeOf(2, 3));
  expect(chargeOf(2, 3)).toBeLessThan(chargeOf(3, 0));
});
