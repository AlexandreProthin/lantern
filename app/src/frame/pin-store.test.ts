import { beforeEach, expect, test } from 'vitest';
import { browserPinStore, browserForgetPins, cleanPins } from './pin-store';

const memory = new Map<string, string>();
beforeEach(() => {
  memory.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => { memory.set(k, v); }, removeItem: (k: string) => { memory.delete(k); }
  };
});

test('GV-17: only well-formed pins are read', () => {
  expect(cleanPins({ a: [1, 2], b: [1], c: ['1', 2], d: [Infinity, 0], '': [0, 0], e: [-3.5, 4] })).toEqual({ a: [1, 2], e: [-3.5, 4] });
  expect(cleanPins(null)).toEqual({});
  expect(cleanPins([[1, 2]])).toEqual({});
});

test('GV-17: the browser keeps pins per subject and drops a subject with none or a deleted one', async () => {
  await browserPinStore.save('tides', { m1: [10, 20] });
  await browserPinStore.save('llm', { l2: [-5, 6] });
  expect(await browserPinStore.load('tides')).toEqual({ m1: [10, 20] });
  await browserPinStore.save('tides', {});
  expect(JSON.parse(memory.get('lantern.pinned')!)).toEqual({ llm: { l2: [-5, 6] } });
  browserForgetPins('llm');
  expect(await browserPinStore.load('llm')).toEqual({});
  memory.set('lantern.pinned', 'not json');
  expect(await browserPinStore.load('llm')).toEqual({});
});
