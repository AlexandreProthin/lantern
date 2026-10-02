import { expect, test } from 'vitest';
import { spawnProgress } from './spawn-motion';
import { graphMotion } from './graphMotion';

test('branches grow sequentially, with a pause after each arrival', () => {
  const duration = graphMotion.SPAWN_GROW_MS, gap = graphMotion.SPAWN_STAGGER_MS;
  expect(spawnProgress(100, 0, 99)).toBe(0);
  expect(spawnProgress(100, 0, 100 + duration / 2)).toBeGreaterThan(0);
  expect(spawnProgress(100, 1, 100 + duration)).toBe(0);
  expect(spawnProgress(100, 0, 100 + duration)).toBe(1);
  expect(spawnProgress(100, 1, 100 + duration + gap)).toBe(0);
  expect(spawnProgress(100, 1, 100 + 2 * duration + gap)).toBe(1);
  expect(spawnProgress(100, 2, 100 + 2 * duration + gap)).toBe(0);
  expect(spawnProgress(100, 2, 100 + 3 * duration + 2 * gap)).toBe(1);
  expect(spawnProgress(-Infinity, 2, 0)).toBe(1);
});
