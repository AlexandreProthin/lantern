import { expect, test } from 'vitest';
import { cutNotes, greeting, greetingMs, keepNotes, releasePage } from './greeting';
import { emptyAmberState } from './state';

const lines = { first: 'Hello, I’m Amber.', updated: (v: string) => `Lantern ${v} is here. What’s new:`, pool: [{ id: 'greet.1', text: 'Hello again.' }, { id: 'greet.2', text: 'Welcome back.' }] };

test('CO-30: the first launch after a fresh install has its own line, then launches pick from the pool, never twice in a row', () => {
  const first = greeting(emptyAmberState(), '0.4.0', false, lines);
  expect(first.greeting).toEqual({ kind: 'first', text: 'Hello, I’m Amber.' }); expect(first.next.lastVersion).toBe('0.4.0');
  let state = first.next;
  for (let i = 0; i < 6; i++) {
    const g = greeting(state, '0.4.0', true, lines, () => .99);
    expect(g.greeting.kind).toBe('launch'); expect((g.greeting as { id: string }).id).not.toBe(state.lastGreeting);
    state = g.next;
  }
});
test('CO-31: after an update, the line names the version and brings the notes kept at install; they are then dropped', () => {
  const before = keepNotes({ ...emptyAmberState(), lastVersion: '0.4.0' }, '0.4.1', '  Amber can sit down.  ');
  expect(before.notes).toEqual({ version: '0.4.1', text: 'Amber can sit down.' });
  const g = greeting(before, '0.4.1', true, lines);
  expect(g.greeting).toEqual({ kind: 'update', version: '0.4.1', text: 'Lantern 0.4.1 is here. What’s new:', notes: 'Amber can sit down.' });
  expect(g.next.notes).toBeUndefined(); expect(g.next.lastVersion).toBe('0.4.1');
  // Notes for another version are not shown; an update from before Amber (known app, no version) is an update.
  expect(greeting({ ...before, lastVersion: '0.4.0', notes: { version: '0.5.0', text: 'x' } }, '0.4.1', true, lines).greeting).toEqual({ kind: 'update', version: '0.4.1', text: 'Lantern 0.4.1 is here. What’s new:' });
  expect(greeting(emptyAmberState(), '0.4.0', true, lines).greeting.kind).toBe('update');
  expect(keepNotes(emptyAmberState(), '1.0.0', null)).toEqual(emptyAmberState());
  expect(releasePage('0.4.1')).toBe('https://github.com/AlexandreProthin/lantern/releases/tag/v0.4.1');
});
test('CO-31: long notes are cut at a word; the fade gives notes a little longer, at most 15 s', () => {
  const long = 'word '.repeat(100);
  const { short, cut } = cutNotes(long); expect(cut).toBe(true); expect(short.length).toBeLessThanOrEqual(281); expect(short.endsWith('word…')).toBe(true);
  expect(cutNotes('Short.')).toEqual({ short: 'Short.', cut: false });
  expect(greetingMs({ kind: 'launch', id: 'a', text: 'Hi' }, 'Hi')).toBe(6000);
  expect(greetingMs({ kind: 'update', version: '1', text: 'x', notes: long }, short)).toBeLessThanOrEqual(15000);
});
