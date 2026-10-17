import { expect, test, vi } from 'vitest';
import { CategoryGate, splitReply } from './gate';
import { amberRequest, FOCUS_CLIP, AMBER_SYSTEM } from './prompt';
import type { AmberHelp } from './prompt';
import { AmberChat } from './chat';
import { AmberFakeProvider } from './fake-provider';
import { amberHelp } from './help';
import type { AmberLog, AmberLogRecord } from './log';
import { ProviderError, zeroUsage } from '../provider';
import type { InferenceProvider } from '../provider';
import { rooms } from '../../rooms';

const feed = (chunks: string[]) => { const g = new CategoryGate(), shown: string[] = []; for (const c of chunks) shown.push(g.push(c)); shown.push(g.finish()); return { g, shown }; };

test('CO-42: text is held until the tag closes, then streams; the tag may arrive in pieces', () => {
  const { g, shown } = feed(['  <cate', 'gory>sub', 'ject</category>\nThe ', 'tide turns.']);
  expect(shown).toEqual(['', '', 'The ', 'tide turns.', '']); expect(g.category).toBe('subject'); expect(g.tagOk).toBe(true);
});
test('CO-42: a missing, unknown or never-closed tag reads as general, logged as broken, and the text is still shown', () => {
  expect(splitReply('Press Ctrl+J.')).toEqual({ category: 'general', tagOk: false, answer: 'Press Ctrl+J.' });
  expect(splitReply('<category>weather</category>Rain.')).toEqual({ category: 'general', tagOk: false, answer: 'Rain.' });
  expect(splitReply('<category>app')).toEqual({ category: 'general', tagOk: false, answer: '<category>app' });
  expect(splitReply('<category>' + 'x'.repeat(60))).toMatchObject({ category: 'general', tagOk: false });
  expect(splitReply('<category>APP</category>  Yes.')).toEqual({ category: 'app', tagOk: true, answer: 'Yes.' });
});

const help: AmberHelp = { about: 'About.', shortcuts: 'Ctrl+J — Ask Amber', guide: [{ room: 'Learn', space: 'Study', lines: ['Light a dark node: Enter.'] }], tips: ['Tip one.'] };
test('CO-43: the system holds the guides and the app help; the prompt the place, the subject, the chat and the question', () => {
  const long = 'w'.repeat(FOCUS_CLIP + 50);
  const r = amberRequest(help, { room: 'Learn', space: 'Study', subject: { title: 'Tides', focus: { title: 'Spring tides', explanation: long } } },
    [{ question: 'What is a neap tide?', answer: 'A weak one.', category: 'subject' }], 'And a spring tide?', undefined);
  expect(r.system.startsWith(AMBER_SYSTEM)).toBe(true);
  for (const part of ['APP HELP', 'About.', 'SHORTCUTS', 'Ctrl+J — Ask Amber', 'Learn → Study:\n- Light a dark node: Enter.', 'TIPS\n- Tip one.']) expect(r.system).toContain(part);
  expect(r.prompt).toContain('WHERE THE USER IS: the Learn room, Study space.');
  expect(r.prompt).toContain('Subject: "Tides"\nFocused node: "Spring tides"');
  expect(r.prompt).toContain('w'.repeat(FOCUS_CLIP) + '…'); expect(r.prompt).not.toContain('w'.repeat(FOCUS_CLIP + 1));
  expect(r.prompt).toContain('EARLIER IN THIS CHAT\nUSER: What is a neap tide?\nAMBER: A weak one.');
  expect(r.prompt.endsWith("USER'S MESSAGE: And a spring tide?")).toBe(true);
  const none = amberRequest(help, { room: 'Choose', space: 'Welcome' }, [], 'Hi', 'heated bed');
  expect(none.prompt).toContain('(no subject is open)'); expect(none.prompt).toContain('SELECTED TEXT: "heated bed"\nUSER\'S MESSAGE: Hi');
  expect(none.prompt).not.toContain('EARLIER IN THIS CHAT');
});
test('CO-43, CO-23: the help lists every room, every space with guide lines, the shortcut table and every tip', () => {
  const h = amberHelp(rooms);
  expect(h.about).toContain('The Learn room (spaces: Welcome, Study, Gallery)'); expect(h.about).toContain('The Choose room (spaces: Welcome, Survey, Compare, Gallery)');
  expect(h.guide.map(g => `${g.room}/${g.space}`)).toEqual(['Learn/Welcome', 'Learn/Study', 'Learn/Gallery', 'Choose/Welcome', 'Choose/Survey', 'Choose/Compare', 'Choose/Gallery']);
  expect(h.shortcuts).toContain('Ctrl+J — Ask Amber'); expect(h.shortcuts).toContain('Ctrl+Shift+2 — Choose');
  expect(h.tips.length).toBe(9 + 8 + 8);
});

const memoryLog = () => { const records: AmberLogRecord[] = []; const log: AmberLog = { append: async r => { records.push(r); }, totals: async () => ({ input: 0, output: 0, calls: 0 }) }; return { records, log }; };
const newChat = (provider: InferenceProvider, log: AmberLog, changed = () => {}) =>
  new AmberChat(provider, log, () => 'claude-haiku-5-5', () => help, () => ({ room: 'Learn', space: 'Study' }), changed);

test('CO-42, CO-44, CO-46, CO-47: one low-effort call per question on Amber\'s model, no web; follow-ups carry the chat; each call logged', async () => {
  const provider = new AmberFakeProvider(0), spy = vi.spyOn(provider, 'stream'), { records, log } = memoryLog(), phases: string[] = [];
  const chat = newChat(provider, log, () => phases.push(chat.phase));
  await chat.ask('Which key opens the settings?');
  await chat.ask('And what does this node say?');
  expect(spy).toHaveBeenCalledTimes(2);
  const [first] = spy.mock.calls[0]; expect(first).toMatchObject({ model: 'claude-haiku-5-5', effort: 'low' }); expect(first.web).toBeUndefined();
  expect(spy.mock.calls[1][0].prompt).toContain('USER: Which key opens the settings?');
  expect(chat.turns.map(t => t.category)).toEqual(['app', 'subject']);
  expect(chat.turns[1].answer).toContain('(follow-up 2)'); expect(chat.turns[0].answer).not.toContain('<category>');
  expect(phases).toContain('thinking'); expect(phases).toContain('streaming'); expect(chat.phase).toBe('idle');
  expect(records.map(r => [r.kind, r.category, r.tagOk, r.outcome, r.effort, r.promptVersion])).toEqual([['ask', 'app', true, 'ok', 'low', 'amber-1'], ['ask', 'subject', true, 'ok', 'low', 'amber-1']]);
  expect(records[0].usage.input).toBeGreaterThan(0);
  chat.close(); expect(chat.turns).toEqual([]);
});
test('CO-42: a reply without a tag still answers, as general, and the log says the tag was broken', async () => {
  const { records, log } = memoryLog(), warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const chat = newChat(new AmberFakeProvider(0), log); await chat.ask('What is a lantern? [no tag]');
  expect(chat.turns[0]).toMatchObject({ category: 'general' }); expect(chat.turns[0].answer.length).toBeGreaterThan(0);
  expect(records[0]).toMatchObject({ category: 'general', tagOk: false }); expect(warn).toHaveBeenCalled(); warn.mockRestore();
});
test('CO-49: a failure keeps the question with its fix-it kind; Retry asks again; closing cancels and forgets', async () => {
  const { records, log } = memoryLog(), chat = newChat(new AmberFakeProvider(0, 'usage-limit'), log);
  await chat.ask('Hello?');
  expect(chat.phase).toBe('error'); expect(chat.pending?.error?.kind).toBe('usage-limit'); expect(chat.turns).toEqual([]);
  expect(records[0]).toMatchObject({ outcome: 'error', errorKind: 'usage-limit', category: null });
  await chat.retry(); expect(chat.phase).toBe('idle'); expect(chat.turns).toHaveLength(1);
  const slow = newChat(new AmberFakeProvider(50), log), running = slow.ask('Long one');
  slow.close(); await running;
  expect(slow.pending).toBeNull(); expect(slow.turns).toEqual([]); expect(records.at(-1)).toMatchObject({ outcome: 'cancelled' });
});
test('CO-47: a provider error that is not a ProviderError is reported as a crash and logged', async () => {
  const { records, log } = memoryLog();
  const chat = newChat({ stream: async () => { throw new Error('boom'); } }, log); await chat.ask('Hi');
  expect(chat.pending?.error).toBeInstanceOf(ProviderError); expect(chat.pending?.error?.kind).toBe('process-crashed');
  expect(records[0]).toMatchObject({ outcome: 'error', usage: zeroUsage() });
});
