import { expect, test } from 'vitest';
import { countKinds, sparkShapes } from './ember-canvas';
import { arrivalSparks } from './spawn-motion';
import { graphMotion } from './graphMotion';

test('GV-114: the canvas counts what it draws by kind, for tests and traces', () => {
  expect(countKinds([{ kind: 'tip', x: 0, y: 0, alpha: 1 }, { kind: 'spark', x: 0, y: 0, alpha: 1 }, { kind: 'spark', x: 1, y: 1, alpha: .5 }]))
    .toEqual({ tip: 1, spark: 2 });
  expect(countKinds([])).toEqual({});
});

test('GV-114: the pictures keep the SVG sizes: comet 16/9/3, tip 12/6/2.5, preview bead 3 with its 4 px glow', () => {
  expect(sparkShapes.comet.rings.map(r => r.r)).toEqual([16, 9, 3]);
  expect(sparkShapes.tip.rings.map(r => r.r)).toEqual([12, 6, 2.5]);
  expect(sparkShapes.bead).toEqual({ rings: [{ r: 3, token: '--node-lit' }], shadow: 4 });
});

test('GV-92: a branch arrives with a ring of sparks just outside its disc, flying out', () => {
  const sparks = arrivalSparks(100, 50, 7);
  expect(sparks).toHaveLength(graphMotion.SPAWN_PARTICLES);
  for (const s of sparks) {
    expect(Math.hypot(s.x - 100, s.y - 50)).toBeCloseTo(24);
    expect((s.x - 100) * s.vx + (s.y - 50) * s.vy).toBeGreaterThan(0);
    expect(s.born).toBe(7);
  }
});
