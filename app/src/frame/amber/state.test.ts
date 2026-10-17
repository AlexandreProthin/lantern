import { expect, test } from 'vitest';
import { emptyAmberState, markTipSeen, nextTip, parseAmberState, setSpot, spotOf } from './state';
import { totalsOf } from './log';
import { defaultSettings, validateSettings } from '../settings';
import { MODELS } from '../../core/models';
import { rooms } from '../../rooms';
import { strings } from '../../ui/strings';

test('SE-50: a missing or damaged companion part reads as empty; bad entries are dropped', () => {
  expect(parseAmberState(undefined)).toEqual(emptyAmberState());
  expect(parseAmberState({ spots: [], seenTips: 'x' })).toEqual(emptyAmberState());
  expect(parseAmberState({ spots: { 'learn/study': 'hang-3', 'bad key!': 'x', 'choose/survey': 4 }, seenTips: ['a', 'a', 2, 'b'] }))
    .toEqual({ spots: { 'learn/study': 'hang-3' }, seenTips: ['a', 'b'] });
});
test('CO-15: the spot is kept per room and space', () => {
  const state = setSpot(setSpot(emptyAmberState(), 'learn', 'study', 'rest-2'), 'learn', 'welcome', 'hang-9');
  expect(spotOf(state, 'learn', 'study')).toBe('rest-2'); expect(spotOf(state, 'learn', 'welcome')).toBe('hang-9');
  expect(spotOf(state, 'choose', 'study')).toBeUndefined();
});
test('CO-21: unseen tips first, then the cycle continues after the last one shown', () => {
  const pool = ['a', 'b', 'c']; let state = markTipSeen(emptyAmberState(), 'b');
  expect(nextTip(pool, state)).toBe('a'); state = markTipSeen(state, 'a');
  expect(nextTip(pool, state)).toBe('c'); state = markTipSeen(markTipSeen(state, 'c'), 'c');
  expect(state.seenTips).toEqual(['b', 'a', 'c']);
  expect(nextTip(pool, state, 'c')).toBe('a'); expect(nextTip(pool, state, 'a')).toBe('b');
  expect(nextTip([], state)).toBeUndefined();
});
test('CO-47: totals count input and output like a subject, and every record as a call', () => {
  const usage = (input: number, output: number) => ({ input, output, thinking: 7, cacheRead: 9, cacheWrite: 3 });
  expect(totalsOf([{ usage: usage(100, 20) }, { usage: usage(50, 5) }, { usage: { input: -1, output: 'x' } }, null]))
    .toEqual({ input: 150, output: 25, calls: 4 });
});
test('SE-11, CO-1, CO-46: companion keys default on and to Haiku 5.5; bad values reset alone', () => {
  const defaults = defaultSettings();
  expect(validateSettings({}, defaults).companion).toEqual({ show: true, model: 'claude-haiku-5-5' });
  expect(validateSettings({ companion: { show: 'no', model: 'bad id', future: 1 } }, defaults).companion).toEqual({ show: true, model: 'claude-haiku-5-5', future: 1 });
  expect(validateSettings({ companion: { show: false, model: 'sonnet' } }, defaults).companion).toEqual({ show: false, model: 'sonnet' });
});
test('SE-48: Haiku 5.5 sits in the model list before Haiku 4.5', () => {
  const ids = MODELS.map(m => m.id);
  expect(ids.indexOf('claude-haiku-5-5')).toBe(ids.indexOf('claude-haiku-4-5') - 1);
  expect(ids.indexOf('claude-haiku-5-5')).toBe(ids.indexOf('claude-sonnet-5') + 1);
});

test('CO-22, CO-23, GV-73: every space of every registered room has guide lines, and tip ids are unique', () => {
  for (const room of rooms) for (const space of room.spaces) expect(room.companion?.guide[space.id]?.length, `${room.id}/${space.id}`).toBeGreaterThan(0);
  const ids = [...strings.amberTips, ...rooms.flatMap(r => r.companion?.tips ?? [])].map(t => t.id);
  expect(new Set(ids).size).toBe(ids.length);
});
