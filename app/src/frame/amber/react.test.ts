import { expect, test } from 'vitest';
import { addChild } from '../../core/graph';
import { newLearnSubject } from '../../rooms/learn/rules';
import { hangingBase, compose } from './motion';
import type { Mood } from './motion';
import { REACTION_MS, flareAt, glimpse, lookToward, reaction } from './react';

const calm: Mood = { thinking: false, working: false, look: 0, lean: 0, flame: false };
const flare = ['understood'];

test('CO-59: a node reaching a flare state flares; new nodes are glanced at; a moved focus is looked at; nothing on opening', () => {
  const v = newLearnSubject('Tides').rooms.learn, a = addChild(v, v.rootId, { title: 'A', kind: 'axis', state: 'lit', createdBy: 'model' });
  const first = glimpse('learn/tides', v);
  expect(reaction(null, first, flare)).toBeNull();
  expect(reaction(first, glimpse('learn/tides', v), flare)).toBeNull();
  v.focusId = a.id;
  expect(reaction(first, glimpse('learn/tides', v), flare)).toEqual({ kind: 'look', node: a.id });
  const b = addChild(v, a.id, { title: 'B', kind: 'axis', state: 'open', createdBy: 'model' });
  expect(reaction(first, glimpse('learn/tides', v), flare)).toEqual({ kind: 'glance', node: b.id });
  a.state = 'understood';
  expect(reaction(first, glimpse('learn/tides', v), flare)).toEqual({ kind: 'flare', node: a.id });
  // Already understood before: no flare again; another subject: nothing.
  const after = glimpse('learn/tides', v);
  expect(reaction(after, glimpse('learn/tides', v), flare)).toBeNull();
  expect(reaction(after, glimpse('learn/ocean', v), flare)).toBeNull();
});
test('CO-59: the flare rises quickly and fades out within its time', () => {
  expect(flareAt(0)).toBe(0); expect(flareAt(180)).toBeCloseTo(1); expect(flareAt(REACTION_MS.flare)).toBe(0);
  expect(flareAt(90)).toBeGreaterThan(0); expect(flareAt(800)).toBeLessThan(flareAt(400));
  expect(lookToward({ x: 100, y: 100 }, { x: 400, y: 0 })).toBe(1); expect(lookToward({ x: 100, y: 100 }, { x: 40, y: 0 })).toBe(-.5);
});
test('CO-59, CO-56: the flare lights the halo and opens the eyes; the doze closes them; reduced motion ignores both', () => {
  const lit = compose(hangingBase(), null, { ...calm, flare: 1 }, 0, false);
  expect(lit.flare).toBe(1); expect(lit.lid).toBeLessThanOrEqual(.1);
  const dozing = compose(hangingBase(), null, { ...calm, doze: 1 }, 0, false);
  expect(dozing.lid).toBeCloseTo(.8); expect(dozing.flare).toBeUndefined();
  const still = compose(hangingBase(), null, { ...calm, flare: 1, doze: 1 }, 0, true);
  expect(still).toEqual(compose(hangingBase(), null, calm, 0, true));
});
