import { expect, test } from 'vitest';
import { newLearnSubject } from './rules';
import { nodeLinks, parseReply, visibleText } from './protocol';
test('TP-31: first parseable block wins, fences and unknown keys tolerated', () => {
  const raw = 'Explanation\n<options>bad</options>\n<options>\n```json\n[{"title":"A","hook":"a","extra":true},{"title":"B","kind":"unknown"},{"hook":"skip"}]\n```\n</options>\nTrailing prose';
  const result = parseReply(raw, 'light'); expect(result.text).toBe('Explanation');
  expect(result.options).toEqual([{ title: 'A', hook: 'a', kind: 'deeper' }, { title: 'B', hook: '', kind: 'deeper' }]);
});
test('TP-32: all streaming tag prefixes stay hidden; generic angle brackets and completed fences remain visible', () => {
  for (const tag of ['<options>', '<branch>', '<understood/>', '<understood />']) {
    for (let i = 1; i <= tag.length; i++) expect(visibleText('Text\n' + tag.slice(0, i))).toBe('Text');
  }
  expect(visibleText('Use List<T>')).toBe('Use List<T>');
  expect(visibleText('Text\n```json\n<options>[]</options>')).toBe('Text');
  expect(visibleText('```ts\nconst x = 1;\n```')).toBe('```ts\nconst x = 1;\n```');
});
test('TP-30/34/35: task gating, malformed prose survives and empty explanations fail', () => {
  const raw = 'Text<options>[{"title":"A"}]</options><branch>{"title":"B"}</branch><understood />';
  expect(parseReply(raw, 'check', true)).toMatchObject({ options: [], branch: null, understood: false });
  expect(parseReply(raw, 'reply', false)).toMatchObject({ options: [], branch: { title: 'B', hook: '' }, understood: false });
  expect(parseReply(raw, 'reply', true).understood).toBe(true);
  expect(parseReply('Usable<options>{broken}</options>', 'light')).toMatchObject({ text: 'Usable', emptyError: false, optionsValid: false });
  expect(parseReply('<options>[]</options>', 'light').emptyError).toBe(true);
  expect(parseReply('Ignored prose<options>[]</options>', 'more').text).toBe('');
});
test('TP-33/DM-22: link resolution changes after deletion without rewriting text', () => {
  const s = newLearnSubject('Tides'); const v = s.rooms.learn; const id = v.rootId;
  const text = `[Tides](node:${id}) [Ghost](node:missing)`;
  expect(nodeLinks(text, v).map(l => l.exists)).toEqual([true, false]);
  delete v.nodes[id]; expect(nodeLinks(text, v).map(l => l.exists)).toEqual([false, false]);
});
