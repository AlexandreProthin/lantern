import { expect, test } from 'vitest';
import { AMBER_H, AMBER_W, BAR, DEFAULT_SPOT, FEET_Y, TIE_Y, bubbleBox, defaultHang, dropTarget, hangSpots, parseSpotId, restSpots, spotById } from './place';
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
  const view = { width: 1024, height: 720 }, size = { width: 340, height: 220 };
  const spots = hangSpots(1024, 138), right = bubbleBox(spots[9], view, size), left = bubbleBox(spots[0], view, size);
  expect(right.left + 340).toBe(spots[9].left + AMBER_W); expect(left.left).toBe(spots[0].left);
  expect(right.top).toBeGreaterThan(spots[9].top + AMBER_H); expect(right.tail).toBe('up');
  const rest = restSpots(undefined, () => null, rect(0, 56, 1024, 664), labels)[1], above = bubbleBox(rest, view, size);
  expect(above.top).toBeUndefined(); expect(720 - above.bottom!).toBeLessThan(rest.top); expect(above.tail).toBe('down');
});

// CO-20 (amended 2026-11-17): the bubble never covers the reading panel or the graph tools.
const boxOf = (b: ReturnType<typeof bubbleBox>, view: { height: number }, size: { width: number; height: number }) => {
  const top = b.top ?? view.height - b.bottom! - size.height;
  return { left: b.left, top, right: b.left + size.width, bottom: top + size.height };
};
const hits = (a: { left: number; top: number; right: number; bottom: number }, r: Rect) => a.left < r.right && a.right > r.left && a.top < r.bottom && a.bottom > r.top;
// Study at 1280 × 800 as the browser lays it out: the graph tools top right of the graph, zoom and legend at its foot, the panel on the right.
const study = { panel: rect(721, 57, 559, 743), tools: rect(581, 73, 112, 33), zoom: rect(560, 744, 136, 40), legend: rect(16, 690, 543, 98) };
const avoid = Object.values(study), view = { width: 1280, height: 800 }, size = { width: 340, height: 230 };
test('CO-10, CO-20: by default Amber hangs at the rightmost spot clear of the panel and the tools; with nothing to avoid, the last spot', () => {
  const hangs = hangSpots(1280, 0);
  expect(defaultHang(hangs, [])).toBe(DEFAULT_SPOT);
  const id = defaultHang(hangs, avoid), spot = spotById(hangs, undefined, id);
  expect(spot.id).toBe(id); expect(id).not.toBe(DEFAULT_SPOT);
  for (const r of avoid) expect(hits({ left: spot.left, right: spot.left + AMBER_W, top: BAR, bottom: spot.top + AMBER_H }, r)).toBe(false);
  // The next spot to the right would touch the tools or the panel.
  const next = hangs[Number(id.slice(5)) + 1];
  expect(avoid.some(r => hits({ left: next.left - 8, right: next.left + AMBER_W + 8, top: BAR, bottom: next.top + AMBER_H }, r))).toBe(true);
  // Its bubble is under it, clear of everything, the tail on Amber.
  const b = bubbleBox(spot, view, size, avoid), box = boxOf(b, view, size);
  expect(b.tail).toBe('up'); for (const r of avoid) expect(hits(box, r)).toBe(false);
  expect(spot.left + AMBER_W / 2).toBeGreaterThan(box.left + 30); expect(spot.left + AMBER_W / 2).toBeLessThan(box.right - 30);
  // Every spot that cannot avoid the panel itself falls back to the last one.
  expect(defaultHang(hangs, [rect(0, 0, 1280, 800)])).toBe(DEFAULT_SPOT);
});
test('CO-20: from any hanging or resting spot, in Learn and Choose layouts, the bubble and the greeting never cover the panel or the tools', () => {
  // Choose at 1024 × 720: a rail between the graph and the panel.
  const choose = [rect(657, 57, 367, 663), rect(569, 57, 88, 663), rect(437, 73, 112, 33), rect(416, 664, 136, 40), rect(16, 542, 399, 166)];
  for (const [w, hgt, rects, graphWidth] of [[1280, 800, avoid, 713], [1024, 720, choose, 569]] as const) {
    const v = { width: w, height: hgt }, graph = rect(0, 57, graphWidth, hgt - 57), panel = rects[0];
    const rests = restSpots([{ id: 'graph-left', label: '', anchor: 'g', side: 'left', inset: { x: 16, y: 132 } }, { id: 'graph-right', label: '', anchor: 'g', side: 'right', inset: { x: 16, y: 72 } },
      { id: 'panel-right', label: '', anchor: 'p', side: 'right', inset: { x: 24, y: 140 } }], a => a === 'g' ? graph : panel, rect(0, 57, w, hgt - 57), labels);
    for (const spot of [...hangSpots(w, 0), ...rests]) for (const sz of [{ width: 340, height: 230 }, { width: 300, height: 70 }]) {
      const b = bubbleBox(spot, v, sz, rects), box = boxOf(b, v, sz);
      for (const r of rects) expect(hits(box, r), `${w} ${spot.id} ${sz.width}`).toBe(false);
      expect(box.left).toBeGreaterThanOrEqual(8); expect(box.right).toBeLessThanOrEqual(w - 8); expect(box.top).toBeGreaterThanOrEqual(BAR);
    }
  }
});
test('CO-20: hanging over the panel, the bubble opens beside the panel, its tail toward Amber; when nothing is clear it opens as before', () => {
  const hangs = hangSpots(1280, 0), over = hangs[9];
  const b = bubbleBox(over, view, size, avoid);
  expect(b.tail).toBe('right'); expect(b.left + size.width).toBeLessThanOrEqual(study.panel.left);
  // A phone-sized window where the panel is everything: no clear place, so the bubble keeps its old place.
  expect(bubbleBox(over, view, size, [rect(0, 0, 1280, 800)])).toEqual(bubbleBox(over, view, size));
  // The header's real height (a taller header) bounds a bubble that has to move away from Amber.
  const tall = bubbleBox(over, { ...view, bar: 120 }, size, [study.panel]), usual = bubbleBox(over, view, size, [study.panel]);
  expect(usual.top!).toBeLessThan(128); expect(tall.top!).toBeGreaterThanOrEqual(128);
});
