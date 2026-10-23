import { describe, expect, it } from 'vitest';
import { callTokens, clampHeight, emptyFilter, estimateTokens, fold, formatDuration, formatTime, isFiltering, matches, originsOf, SearchCache, searchText } from './console-filter';
import type { CallEntry, NoteEntry } from './trace.svelte';
import { zeroUsage } from '../provider';

const call = (over: Partial<CallEntry> = {}): CallEntry => ({ id: 1, at: 0, kind: 'call', origin: 'learn·light', requestId: 'r1', model: 'opus', effort: 'low', web: false,
  system: 'You are a tutor.', prompt: 'SUBJECT: tides', stream: [{ kind: 'text', text: 'Tides rise' }, { kind: 'tool', name: 'WebSearch', detail: 'moon pull', at: 1 }],
  status: 'ok', missingLayers: [], ...over });
const note = (over: Partial<NoteEntry> = {}): NoteEntry => ({ id: 2, at: 0, kind: 'action', origin: 'learn', summary: 'lit a node', ...over });

describe('debug console helpers', () => {
  it('DC-10: time comes as HH:MM:SS.mmm', () => {
    const at = new Date(2026, 9, 23, 7, 5, 3, 42).getTime();
    expect(formatTime(at)).toBe('07:05:03.042');
  });
  it('DC-13: tokens, estimate mark and durations', () => {
    expect(callTokens(call())).toBeNull();
    expect(callTokens(call({ completion: { text: '', model: 'opus', usage: { ...zeroUsage(), input: 12345, output: 678 }, durationMs: 1500, outcome: 'ok' } }))).toBe('12.3k→678 tok');
    expect(callTokens(call({ completion: { text: '', model: 'opus', usage: { ...zeroUsage(), input: 3, output: 4 }, durationMs: 1, outcome: 'ok', usageEstimated: true } }))).toBe('~3→4 tok');
    expect(formatDuration(840)).toBe('840 ms'); expect(formatDuration(12_340)).toBe('12.3 s');
    expect(estimateTokens(10)).toBe(4);
  });
  it('DC-15: kinds, origins and free text over expanded texts', () => {
    const f = emptyFilter();
    expect(isFiltering(f)).toBe(false);
    expect(matches(call(), f)).toBe(true);
    f.kinds.call = false; expect(matches(call(), f)).toBe(false); expect(isFiltering(f)).toBe(true);
    f.kinds.call = true; f.origins = ['amber·ask']; expect(matches(call(), f)).toBe(false);
    f.origins = ['learn·light']; expect(matches(call(), f)).toBe(true);
    f.origins = []; f.text = 'MOON tutor'; expect(matches(call(), f)).toBe(true);
    f.text = 'moon absent'; expect(matches(call(), f)).toBe(false);
    f.text = 'clicked'; expect(matches(note({ detail: { how: 'clicked' } }), f)).toBe(true);
    expect(searchText(call())).toContain('⚙ websearch "moon pull"');
  });
  it('DC-15: origins are listed once each; the cache keeps finished entries only', () => {
    expect(originsOf([call(), note(), call({ id: 3 })])).toEqual(['learn', 'learn·light']);
    const cache = new SearchCache(); const running = call({ status: 'running' });
    expect(cache.get(running)).toContain('tides rise');
    running.stream = [{ kind: 'text', text: 'changed' }];
    expect(cache.get(running)).toContain('changed');
    const done = call({ id: 5 }); cache.get(done); done.prompt = 'other';
    expect(cache.get(done)).toContain('subject: tides');
  });
  it('DC-13: long texts fold to their first lines', () => {
    const text = Array.from({ length: 20 }, (_, i) => `line ${i}`).join('\n');
    const folded = fold(text);
    expect(folded.head.split('\n')).toHaveLength(6); expect(folded.hidden).toBeGreaterThan(0);
    expect(fold('short\ntext')).toEqual({ head: 'short\ntext', hidden: 0 });
    expect(fold('x'.repeat(5000)).head.length).toBeLessThan(5000);
  });
  it('DC-11: height stays between 120 px and 70 % of the window', () => {
    expect(clampHeight(50, 1000)).toBe(120); expect(clampHeight(900, 1000)).toBe(700); expect(clampHeight(300, 1000)).toBe(300);
  });
});
