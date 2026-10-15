import { expect, test } from 'vitest';
import { newLearnSubject } from '../../rooms/learn/rules';
import { addChild } from '../../core/graph';
import { searchNodes, stepMatch } from './graph-search';

function subject() {
  const v = newLearnSubject('Ocean tides').rooms.learn;
  v.nodes[v.rootId].state = 'lit';
  const moon = addChild(v, v.rootId, { title: 'The Moon', hook: 'Its pull', kind: 'axis', state: 'open', createdBy: 'model' });
  const sun = addChild(v, v.rootId, { title: 'The Sun', hook: '', kind: 'axis', state: 'open', createdBy: 'model' });
  moon.state = 'lit'; moon.content = 'The near side is pulled  MORE strongly.';
  const bulge = addChild(v, moon.id, { title: 'Tidal bulge', hook: '', kind: 'deeper', state: 'open', createdBy: 'model' });
  sun.dialogue.push({ role: 'user', text: 'Why is the Sun’s effect weaker? Éloigné ?', at: '', author: { kind: 'user', by: 'Me' } });
  return { v, moon, sun, bulge };
}

test('GV-57: matches title, hook, explanation and dialogue, ignoring case, accents and spaces', () => {
  const { v, moon, sun, bulge } = subject();
  expect(searchNodes(v, 'tid')).toEqual([v.rootId, bulge.id]);
  expect(searchNodes(v, 'its PULL')).toEqual([moon.id]);
  expect(searchNodes(v, 'pulled more')).toEqual([moon.id]);
  expect(searchNodes(v, 'eloigne')).toEqual([sun.id]);
  expect(searchNodes(v, '   ')).toEqual([]);
  expect(searchNodes(v, 'nothing like this')).toEqual([]);
});

test('GV-57: tree order, depth first, and wrapping steps', () => {
  const { v, moon, sun, bulge } = subject();
  const all = searchNodes(v, 'e');
  expect(all).toEqual([v.rootId, moon.id, bulge.id, sun.id]);
  expect(stepMatch(all, sun.id, 1)).toBe(v.rootId);
  expect(stepMatch(all, v.rootId, -1)).toBe(sun.id);
  expect(stepMatch(all, moon.id, 1)).toBe(bulge.id);
  expect(stepMatch([moon.id, sun.id], v.rootId, 1)).toBe(moon.id);
  expect(stepMatch([moon.id, sun.id], v.rootId, -1)).toBe(sun.id);
  expect(stepMatch([], v.rootId, 1)).toBeUndefined();
});
