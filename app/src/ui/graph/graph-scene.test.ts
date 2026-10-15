import { expect, test } from 'vitest';
import { newLearnSubject } from '../../rooms/learn/rules';
import { addChild } from '../../core/graph';
import { GraphScene } from './graph-scene';
const options = { spawnTasks: ['intro', 'light', 'more'], ghost: { kind: 'deeper', state: 'open' } };
const run = (id: string, task: 'light' | 'reply' = 'light') => ({ nodeId: id, task, text: '', controller: new AbortController() });
test('GV-92/94/96: transient slots become nodes with stable keys and transfer positions', () => {
  const v = newLearnSubject('Tides').rooms.learn, scene = new GraphScene(options);
  const initial = Object.values(scene.update(v, run(v.rootId), 0, false)).filter(n => n.pending);
  expect(initial).toHaveLength(3); expect(Object.keys(v.nodes)).toHaveLength(1);
  v.nodes[v.rootId].state = 'lit';
  const child = addChild(v, v.rootId, { title: 'Gravity', hook: '', kind: 'axis', state: 'open', createdBy: 'model' });
  const done = scene.update(v, null, 100, false);
  expect(scene.key(child.id)).toBe(initial[0].id); expect(scene.transfers).toEqual([{ from: initial[0].id, to: child.id }]);
  expect(Object.values(done).filter(n => n.pending === 'shrinking')).toHaveLength(2);
  expect(Object.values(scene.update(v, null, 401, false)).filter(n => n.pending)).toHaveLength(0);
});
test('GV-93/97/101: cancellation shrinks; reduced motion removes immediately; reply has no slots', () => {
  const v = newLearnSubject('Tides').rooms.learn, scene = new GraphScene(options);
  scene.update(v, run(v.rootId), 0, false);
  expect(Object.values(scene.update(v, null, 100, false)).filter(n => n.pending)).toHaveLength(3);
  expect(Object.values(scene.update(v, null, 101, true)).filter(n => n.pending)).toHaveLength(0);
  expect(Object.values(scene.update(v, run(v.rootId, 'reply'), 102, false)).filter(n => n.pending)).toHaveLength(0);
});
