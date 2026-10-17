import { expect, test } from 'vitest';
import { Rope, flightPoint, flightDuration } from './rope';

test('CO-12: held, the rope follows the hand and keeps a little slack, so it bows instead of drawing a straight line', () => {
  const rope = new Rope({ x: 100, y: 56 }, { x: 160, y: 120 });
  rope.hold({ x: 180, y: 130 });
  for (let i = 0; i < 120; i++) rope.step();
  expect(rope.end).toMatchObject({ x: 180, y: 130 });
  expect(rope.points[0]).toMatchObject({ x: 100, y: 56 });
  const mid = rope.points[4], straightY = 56 + (130 - 56) * ((mid.x - 100) / 80);
  expect(mid.y).toBeGreaterThan(straightY + 1);
});
test('CO-12: let go off-centre, Amber swings under the tie, then settles there, its rope length kept', () => {
  const rope = new Rope({ x: 100, y: 56 }, { x: 160, y: 110 });
  rope.release(80);
  const xs: number[] = [];
  let steps = 0;
  while (!rope.settled() && steps < 120 * 20) { rope.step(); steps++; if (steps % 12 === 0) xs.push(rope.end.x); }
  expect(rope.settled()).toBe(true);
  // It crossed under the tie at least once: a swing, not a slide.
  expect(xs.some(x => x < 100)).toBe(true);
  expect(Math.abs(rope.end.x - 100)).toBeLessThan(1);
  expect(Math.hypot(rope.end.x - 100, rope.end.y - 56)).toBeGreaterThan(74);
  expect(Math.abs(rope.angle())).toBeLessThan(2);
});
test('CO-14: a fall accelerates down to its spot, a flight rises over an arc; both arrive', () => {
  const from = { x: 0, y: 400 }, to = { x: 200, y: 600 };
  expect(flightPoint(from, to, 1, 'fall')).toEqual(to); expect(flightPoint(from, to, 1, 'fly')).toEqual(to);
  expect(flightPoint(from, to, .25, 'fall').y - 400).toBeLessThan(flightPoint(from, to, .75, 'fall').y - flightPoint(from, to, .5, 'fall').y);
  const up = { x: 200, y: 60 }; expect(flightPoint(from, up, .5, 'fly').y).toBeLessThan((400 + 60) / 2);
  expect(flightDuration(from, from)).toBe(350); expect(flightDuration(from, { x: 3000, y: 0 })).toBe(900);
});
