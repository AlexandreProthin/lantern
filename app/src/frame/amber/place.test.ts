import { expect, test } from 'vitest';
import { AMBER_H, AMBER_W, BAR, DEFAULT_SPOT, TIE_Y, bubbleBox, hangSpots, spotById } from './place';

test('CO-11: ten hanging spots equally spaced along the bar, the last one clear of the window controls', () => {
  for (const [width, controls] of [[1024, 138], [1440, 138], [1024, 0]]) {
    const spots = hangSpots(width, controls);
    expect(spots.map(s => s.id)).toEqual(Array.from({ length: 10 }, (_, i) => `hang-${i}`));
    const gaps = spots.slice(1).map((s, i) => s.left - spots[i].left);
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1);
    expect(spots[0].left).toBe(16);
    expect(spots[9].left + AMBER_W).toBeLessThanOrEqual(width - controls - (controls ? 14 : 16));
    // Hanging: the rope ties on just under the bar, and Amber is at least 64 px (IDENTITY.md).
    for (const s of spots) { expect(s.top + TIE_Y).toBeGreaterThan(BAR); expect(s.rope).toBeLessThanOrEqual(160); }
  }
  expect(AMBER_W).toBeGreaterThanOrEqual(64); expect(AMBER_H).toBeGreaterThanOrEqual(64);
});
test('CO-15: an unknown saved spot falls back to the default, on the right', () => {
  const spots = hangSpots(1024, 138);
  expect(spotById(spots, 'rest-7').id).toBe(DEFAULT_SPOT); expect(spotById(spots, undefined).id).toBe(DEFAULT_SPOT);
  expect(spotById(spots, 'hang-2').id).toBe('hang-2');
});
test('CO-20: the bubble opens under Amber, toward the middle of the window, and stays inside it', () => {
  const spots = hangSpots(1024, 138), right = bubbleBox(spots[9], 1024, 340), left = bubbleBox(spots[0], 1024, 340);
  expect(right.left + 340).toBe(spots[9].left + AMBER_W); expect(left.left).toBe(spots[0].left);
  expect(right.top).toBeGreaterThan(spots[9].top + AMBER_H);
  expect(bubbleBox(hangSpots(300, 0)[9], 300, 340).left).toBe(8);
});
