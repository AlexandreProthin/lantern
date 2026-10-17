import { expect, test } from 'vitest';
import { AMBER_H, AMBER_W, BAR, DEFAULT_SPOT, FEET_Y, TIE_Y, bubbleBox, dropTarget, hangSpots, parseSpotId, restSpots, spotById } from './place';
import type { Rect } from './place';

const rect = (left: number, top: number, width: number, height: number): Rect => ({ left, top, width, height, right: left + width, bottom: top + height });
const labels = { left: 'Bottom left', right: 'Bottom right' };

test('CO-11: ten hanging spots equally spaced along the bar, the last one clear of the window controls', () => {
  for (const [width, controls] of [[1024, 138], [1440, 138], [1024, 0]]) {
    const spots = hangSpots(width, controls);
    expect(spots.map(s => s.id)).toEqual(Array.from({ length: 10 }, (_, i) => `hang-${i}`));
    const gaps = spots.slice(1).map((s, i) => s.left - spots[i].left);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
    expect(spots[0].left).toBe(16);
    expect(spots[9].left + AMBER_W).toBeLessThanOrEqual(width - controls - (controls ? 14 : 16));
    for (const s of spots) { expect(s.top + TIE_Y).toBeGreaterThan(BAR); expect(s.rope).toBeLessThanOrEqual(160); }
  }
  expect(AMBER_W).toBeGreaterThanOrEqual(64); expect(AMBER_H).toBeGreaterThanOrEqual(64);
});
test('CO-13: a room\'s resting spots sit in its elements\' corners; a missing or collapsed element gives none; else the space\'s corners', () => {
  const spaces = rect(0, 56, 1024, 664), graph = rect(0, 56, 560, 664), panel = rect(564, 56, 460, 664);
  const specs = [{ id: 'graph-left', label: 'GL', anchor: '.graph', side: 'left' as const, inset: { x: 16, y: 96 } },
    { id: 'panel-right', label: 'PR', anchor: '.panel', side: 'right' as const, inset: { x: 24, y: 128 } }];
  const found = restSpots(specs, a => a === '.graph' ? graph : a === '.panel' ? panel : null, spaces, labels);
  expect(found.map(s => [s.id, s.left, s.ground])).toEqual([['rest-graph-left', 16, 720 - 96], ['rest-panel-right', 1024 - 24 - AMBER_W, 720 - 128]]);
  // Standing: the feet on the ground.
  expect(found[0].top + FEET_Y).toBeCloseTo(found[0].ground, 0);
  const collapsed = restSpots(specs, a => a === '.graph' ? rect(0, 56, 28, 664) : null, spaces, labels);
  expect(collapsed.map(s => s.id)).toEqual(['rest-left', 'rest-right']);
  expect(restSpots(undefined, () => null, spaces, labels).map(s => s.label)).toEqual(['Bottom left', 'Bottom right']);
});
test('CO-15: a saved spot keeps its rope; an unknown one falls back to the default, on the right', () => {
  const spots = hangSpots(1024, 138);
  expect(parseSpotId('hang-3:42')).toEqual({ base: 'hang-3', rope: 42 }); expect(parseSpotId('hang-3:999').rope).toBe(160);
  expect(spotById(spots, 'hang-3:42')).toMatchObject({ id: 'hang-3:42', rope: 42, left: spots[3].left, top: BAR + 42 - TIE_Y });
  expect(spotById(spots, 'rest-gone').id).toBe(DEFAULT_SPOT); expect(spotById(spots, undefined).id).toBe(DEFAULT_SPOT);
});
test('CO-12, CO-14: dropped in the top quarter Amber hangs from the nearest point of the bar on the rope it was held at; lower, the nearest rest', () => {
  const hangs = hangSpots(1024, 138), rests = restSpots(undefined, () => null, rect(0, 56, 1024, 664), labels);
  const high = dropTarget(hangs, rests, hangs[4].left + 10, BAR + 60 - TIE_Y, 720);
  expect(high).toMatchObject({ kind: 'hang', id: 'hang-4:60', rope: 60 });
  expect(dropTarget(hangs, rests, 900, 600, 720).id).toBe('rest-right'); expect(dropTarget(hangs, rests, 40, 400, 720).id).toBe('rest-left');
  // The rope never exceeds 160 px.
  expect(dropTarget(hangs, rests, 500, 300 - TIE_Y, 2000).rope).toBe(160);
  expect(dropTarget(hangs, [], 500, 600, 720).kind).toBe('hang');
});
test('CO-20: the bubble opens toward the middle of the window: under a hanging Amber, above a resting one', () => {
  const spots = hangSpots(1024, 138), right = bubbleBox(spots[9], 1024, 340, 720), left = bubbleBox(spots[0], 1024, 340, 720);
  expect(right.left + 340).toBe(spots[9].left + AMBER_W); expect(left.left).toBe(spots[0].left);
  expect(right.top).toBeGreaterThan(spots[9].top + AMBER_H);
  const rest = restSpots(undefined, () => null, rect(0, 56, 1024, 664), labels)[1], above = bubbleBox(rest, 1024, 340, 720);
  expect(above.top).toBeUndefined(); expect(720 - above.bottom!).toBeLessThan(rest.top);
});
