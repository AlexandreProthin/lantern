import { expect, test } from 'vitest';
import { kinds, statesOf } from '../rules';
import { BADGE_OF, LOOK, RANK, hasGlow } from './kinds';

test('CR-21: every state of every kind, and the three subject statuses, has a look and a rank', () => {
  for (const kind of kinds) for (const state of statesOf[kind]) { expect(LOOK[state], `${kind}:${state}`).toBeDefined(); expect(RANK[state]).toBeDefined(); }
  for (const status of ['exploring', 'decided', 'bought']) { expect(LOOK[status]).toBeDefined(); expect(BADGE_OF[status]).toBeDefined(); }
});
test('recipe: badges and glow', () => {
  expect(BADGE_OF.open).toBeUndefined(); expect(BADGE_OF.dismissed).toBeUndefined(); expect(BADGE_OF.lit).toBeUndefined();
  expect(BADGE_OF.must).toBe('must'); expect(BADGE_OF.shortlisted).toBe('shortlisted');
  expect(hasGlow('lit')).toBe(true); expect(hasGlow('chosen')).toBe(true); expect(hasGlow('shortlisted')).toBe(false); expect(hasGlow('exploring')).toBe(true); expect(hasGlow('bought')).toBe(false);
});
test('recipe: rank orders the looks, so a pick outranks a shortlist and a rejection is lowest', () => {
  expect(RANK.chosen).toBeGreaterThan(RANK.shortlisted); expect(RANK.shortlisted).toBeGreaterThan(RANK.lit); expect(RANK.lit).toBeGreaterThan(RANK.open); expect(RANK.open).toBeGreaterThan(RANK.rejected);
});
