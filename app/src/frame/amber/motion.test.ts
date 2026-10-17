import { expect, test } from 'vitest';
import { GESTURE, GESTURES, pose, still } from '../../assets/identity/companion/lantern';
import { actDone, compose, dangle, flightBase, grabbedBase, hangingBase, INTERRUPT, lookAt, restingBase, startAct } from './motion';
import type { Mood } from './motion';

const calm: Mood = { thinking: false, working: false, look: 0, lean: 0, flame: false };

test('CO-56: reduced motion is the still base: no gesture, no flame, no eyes', () => {
  const z = compose(hangingBase(), startAct(GESTURE.curiosity, 0, null), { ...calm, flame: true, look: 1, thinking: true }, 400, true);
  expect(z).toEqual({ ...still(GESTURE.suspension), flameTime: 0 });
});
test('CO-50: hanging, a gesture moves the tilt, gaze or lids but keeps the rope (line and pivot at the loop)', () => {
  for (const g of [GESTURE.rest, GESTURE.curiosity, GESTURE.suspension]) {
    for (const t of [0, 300, 900]) { const z = compose(hangingBase(), startAct(g, 0, null), calm, t); expect(z.line).toBe(1); expect(z.pivot).toBe(4); expect(z.feet).toBe(0); }
  }
  expect(compose(hangingBase(), startAct(GESTURE.curiosity, 0, null), calm, 600).gaze).toBeCloseTo(pose(GESTURE.curiosity, 600).gaze);
  expect(compose(hangingBase(), startAct(GESTURE.rest, 0, null), calm, 870).lid).toBeGreaterThan(.5);
});
test('CO-50: a few steps in end exactly at the resting pose; after the gesture the base is back', () => {
  const end = compose(restingBase(), startAct(GESTURE.steps, 0, null), calm, GESTURES[GESTURE.steps].duration - 1);
  expect(end.x).toBeCloseTo(0, 1); expect(end.feet).toBeCloseTo(1); expect(end.y).toBeCloseTo(restingBase().y, 0);
  expect(compose(restingBase(), startAct(GESTURE.steps, 0, null), calm, 100).x).toBeLessThan(-10);
  expect(actDone(startAct(GESTURE.steps, 0, null), GESTURES[GESTURE.steps].duration)).toBe(true);
  expect(compose(restingBase(), startAct(GESTURE.steps, 0, null), calm, 99999)).toMatchObject({ ...restingBase(), flameTime: 0 });
});
test('CO-56: an interrupted gesture blends from where it was over 180 ms', () => {
  const from = { ...hangingBase(), angle: 8, gaze: 3 };
  const at0 = compose(hangingBase(), startAct(GESTURE.rest, 1000, from), calm, 1000), after = compose(hangingBase(), startAct(GESTURE.rest, 1000, from), calm, 1000 + INTERRUPT);
  expect(at0.angle).toBeCloseTo(8); expect(at0.gaze).toBeCloseTo(3); expect(after.angle).toBeCloseTo(0); expect(after.gaze).toBeCloseTo(0);
});
test('CO-52/51: the flame lives on its own clock; the eyes turn toward a near pointer only', () => {
  expect(compose(hangingBase(), null, { ...calm, flame: true }, 5000).flameTime).toBe(5000);
  expect(compose(hangingBase(), null, calm, 5000).flameTime).toBe(0);
  expect(lookAt({ x: 100, y: 100 }, { x: 600, y: 100 })).toBe(0);
  expect(lookAt({ x: 100, y: 100 }, { x: 160, y: 120 })).toBeGreaterThan(.5);
  expect(lookAt({ x: 100, y: 100 }, { x: 40, y: 120 })).toBeLessThan(-.5);
  expect(compose(hangingBase(), null, { ...calm, look: 1 }, 0).gaze).toBe(3);
});
test('CO-54: thinking and working move only tilt, gaze, lids and a small bob, never the shape', () => {
  for (const mood of [{ ...calm, thinking: true }, { ...calm, working: true }]) for (let t = 0; t < 4000; t += 137) {
    const z = compose(hangingBase(), null, mood, t);
    expect(Math.abs(z.angle)).toBeLessThan(2); expect(Math.abs(z.gaze)).toBeLessThanOrEqual(3.5); expect(z.lid).toBeLessThan(.6);
    expect(z.y).toBeGreaterThanOrEqual(-1.3); expect(z.x).toBe(0); expect(z.line).toBe(1); expect(z.flameTime).toBeGreaterThan(-1);
  }
  expect(compose(hangingBase(), null, { ...calm, working: true }, 1000).flameTime).toBe(1600);
});
test('CO-14, CO-54: flights run the release\'s lift and landing; dangling tilts against the hand and settles', () => {
  expect(flightBase('fly', 1)).toEqual(pose(GESTURE.lift, GESTURES[GESTURE.lift].duration));
  expect(flightBase('fall', 0).y).toBeCloseTo(-17); expect(flightBase('fall', 1).feet).toBeGreaterThan(.6);
  let a = 0; for (let i = 0; i < 60; i++) a = dangle(a, 1, 16); expect(a).toBeCloseTo(16, 0);
  for (let i = 0; i < 120; i++) a = dangle(a, 0, 16); expect(Math.abs(a)).toBeLessThan(.1);
  expect(grabbedBase()).toMatchObject({ line: 1, feet: .5 });
});
