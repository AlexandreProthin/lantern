import { expect, test } from 'vitest';
import { forceSimulation } from 'd3-force';
import { labelBox, labelCollide, overlaps, separation, discBox, estimateWidth, type LabelBox } from './label-force';

const measure = estimateWidth;

test('GV-15: a title box is the disc and the wrapped title under it, at most 3 lines in the 134 px column', () => {
  expect(labelBox('', measure)).toEqual(discBox);
  const short = labelBox('Tides', measure);
  expect(short.hw).toBe(22);                       // narrower than the disc: the disc's width
  expect(short.top).toBe(-22);
  expect(short.bottom).toBeCloseTo(22 + 14 + 19.5);
  const two = labelBox('Concept number 12 of the course', measure);
  expect(two.bottom).toBeCloseTo(22 + 14 + 2 * 19.5);
  expect(two.hw).toBeLessThanOrEqual(67);
  const long = labelBox('word '.repeat(80), measure);
  expect(long.bottom).toBeCloseTo(22 + 14 + 3 * 19.5);
  // A single word longer than the column breaks anywhere.
  expect(labelBox('x'.repeat(50), measure).bottom).toBeCloseTo(22 + 14 + 3 * 19.5);
});

test('GV-15: boxes side by side or one under the other are apart only past their sizes and the gaps', () => {
  const box: LabelBox = { hw: 60, top: -22, bottom: 56 };
  expect(separation(0, 0, box, 140, 0, box, 12, 8)).toBeNull();
  const side = separation(0, 0, box, 100, 0, box, 12, 8)!;
  expect(side.x).toBeLessThan(0); expect(side.y).toBe(0);
  const below = separation(0, 0, box, 0, 60, box, 12, 8)!;
  expect(below.y).toBeLessThan(0); expect(below.x).toBe(0);
  // Straight along the line between the centres: no side preferred.
  const diagonal = separation(0, 0, box, 50, 30, box, 12, 8)!;
  expect(diagonal.x / diagonal.y).toBeCloseTo(50 / 30);
  expect(separation(0, 0, box, 0, 0, box, 12, 8)).not.toBeNull();
});

test('GV-15: a crowd of titled nodes spreads until no two titles touch; a fixed node does not move', () => {
  const box = labelBox('Concept number 7 of the course', measure);
  const nodes = Array.from({ length: 30 }, (_, i) => ({ id: `n${i}`, x: (i % 6) * 5, y: Math.floor(i / 6) * 5, fx: i === 0 ? 0 : null, fy: i === 0 ? 0 : null }));
  const sim = forceSimulation(nodes as never[]).force('collide', labelCollide(() => box)).stop();
  for (let i = 0; i < 300; i++) sim.tick();
  expect([nodes[0].x, nodes[0].y]).toEqual([0, 0]);
  let touching = 0;
  for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++)
    if (overlaps(nodes[a].x, nodes[a].y, box, nodes[b].x, nodes[b].y, box)) touching++;
  expect(touching).toBe(0);
});
