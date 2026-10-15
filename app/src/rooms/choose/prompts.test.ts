import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { addChooseChild, answerNeed, newChooseSubject, setState } from './rules';
import { promptVersion, systemPrompt, taskPrompt } from './prompts';
import { tasks } from './rules';

const today = '2026-10-15';
function printer() {
  const v = newChooseSubject('3D printer', { tone: 'curious', model: 'opus', effort: 'medium', locale: { country: 'FR', currency: 'EUR' }, needsNote: 'budget about 500 €' }, 'Alex').rooms.choose;
  setState(v, v.rootId, 'lit');
  const add = (kind: Parameters<typeof addChooseChild>[2]['kind'], title: string, parent = v.rootId, hook = '') => addChooseChild(v, parent, { title, hook, kind, createdBy: 'model' }).id;
  const need = add('need', 'What will you print?', v.rootId, 'size'), crit = add('criterion', 'Build volume', v.rootId, 'size of parts'), fam = add('family', 'Enclosed', v.rootId, 'closed'), p = add('product', 'Bambu A1', fam), concept = add('concept', 'Enclosure');
  answerNeed(v, need, 'figurines', 'Alex'); setState(v, crit, 'must'); setState(v, p, 'shortlisted');
  return { v, root: v.rootId, need, crit, fam, p, concept };
}

test('CP-20/21: the system prompt is the spec text with the web and tone lines filled, sections in order', () => {
  const spec = readFileSync(new URL('../../../../agent_wiki/specs/choose-protocol.md', import.meta.url), 'utf8');
  const block = /````text\n([\s\S]*?)\n````/.exec(spec)![1];
  const on = systemPrompt('curious', true), off = systemPrompt('curious', false);
  expect(on).toBe(block.replace('{{WEB_LINE}}', 'In research tasks you can search the web and read pages; nothing else. Outside research tasks, do not search.')
    .replace('{{TONE_LINE}}', 'Be warm and conversational, as to a bright adult with no background. Give the why before the how, with light analogies, and introduce terminology gently.'));
  expect(off).toContain('You have no web access. Every product fact comes from your own knowledge: mark its source as kind "model" with your knowledge date, and say that prices may have changed.');
  expect(on).not.toContain('{{'); expect(off).not.toContain('{{'); expect(off).not.toContain('search the web');
  expect(on.match(/^[A-Z ]+$/gm)).toEqual(['ROLE', 'METHOD', 'NEEDS', 'SOURCES', 'TONE', 'USER CORRECTIONS', 'LINKS', 'LANGUAGE', 'FORMAT', 'PROTOCOL']);
  expect(promptVersion).toBe('choose-1');
});

test('TP-10/11: tone lines, custom tone read as the user, sanitised', () => {
  for (const tone of ['eli5', 'student', 'engineer', 'expert'] as const) expect(systemPrompt(tone, true)).not.toContain('{{');
  expect(systemPrompt('expert', true)).toContain('Write for an expert in adjacent areas');
  const custom = systemPrompt({ custom: 'Friendly\n"style"' + 'x'.repeat(400) }, true);
  expect(custom).toContain('The user describes the style they want: "Friendlystylexxx'); expect(custom).not.toContain('learner'); expect(custom.match(/x+/g)!.at(-1)!.length).toBeLessThan(400);
  expect(systemPrompt('curious', true)).not.toContain('learner');
});

test('TP-12: every task fills its slots, orders its blocks, and ends with its required ending', () => {
  const t = printer(), ask = (task: Parameters<typeof taskPrompt>[1], focus: string, extra = {}) => taskPrompt(t.v, task, focus, { today, web: task === 'find' || task === 'fill' || task === 'check', ...extra });
  for (const task of tasks) { const p = ask(task, task === 'fill' ? t.p : t.fam); expect(p.prompt).not.toContain('{{'); expect(p.prompt).not.toMatch(/\n{3}/); expect(p.promptVersion).toBe('choose-1'); expect(p.system).toContain('PROTOCOL'); }
  const intro = ask('intro', t.root).prompt;
  expect(intro.startsWith("SUBJECT: 3D printer\n\nUSER'S COUNTRY: FR · CURRENCY: EUR · TODAY: 2026-10-15\n\nIN THE USER'S WORDS:\nbudget about 500 €")).toBe(true);
  expect(intro).toMatch(/Then end with the options block: exactly 3 entries, at least one of kind "need".*$/); expect(intro).not.toContain('BOARD');
  expect(ask('light', t.concept).prompt).toMatch(/options block: exactly 3 ways to go on from here.*No text after the block\.$/);
  expect(ask('light', t.concept).prompt).toContain('The user chose: "Enclosure", a node of kind concept.');
  const order = (text: string, keys: string[]) => keys.map(k => text.indexOf(k)); const sorted = (xs: number[]) => xs.every((x, i) => x >= 0 && (!i || x > xs[i - 1]));
  expect(sorted(order(ask('reply', t.p).prompt, ['SUBJECT:', "USER'S COUNTRY", 'NEEDS', 'BOARD', 'MAP (', 'PATH TO', 'TASK: reply']))).toBe(true);
  const own = addChooseChild(t.v, t.root, { title: 'Quiet printer', hook: 'for night', kind: 'own', createdBy: 'user' }).id;
  expect(ask('light', own).prompt).toContain('The user wrote this node themselves');
});

test('CP-10: light on a need or criterion is prose only; find differs on a family; more lists existing children', () => {
  const t = printer(), ask = (task: Parameters<typeof taskPrompt>[1], focus: string) => taskPrompt(t.v, task, focus, { today, web: false });
  for (const id of [t.need, t.crit]) { const p = ask('light', id).prompt; expect(p).toContain('TASK: explain the current node.'); expect(p).not.toContain('options block'); expect(p).toMatch(/Link to other nodes instead of re-explaining them\.$/); }
  const family = ask('find', t.fam).prompt; expect(family).toContain('Explain the family "Enclosed"'); expect(family).toMatch(/Then end with the products block\.$/);
  expect(ask('find', t.root).prompt).toContain('Write one line per product found.');
  const more = ask('more', t.fam).prompt; expect(more).toContain(`Its existing children, which you must not repeat, reword or replace: ${t.p} "Bambu A1" [product:shortlisted].`); expect(more).toMatch(/No prose before or after it\.$/);
  expect(ask('reply', t.fam).prompt).toMatch(/Most replies need neither\.$/); expect(ask('reply', t.fam).prompt).toContain('No options block.');
});

test('CP-10: fill lists TARGET and outputs cells only; check says what it checks; recommend ends with its block', () => {
  const t = printer(), ask = (task: Parameters<typeof taskPrompt>[1], focus: string, extra = {}) => taskPrompt(t.v, task, focus, { today, web: true, ...extra });
  const fill = ask('fill', t.p).prompt; expect(fill).toContain(`TARGET (the cells to fill, exactly these):\n${t.p} × ${t.crit} (Build volume)`); expect(fill).toMatch(/exactly the cells of TARGET, with the ids shown\. No prose\.$/);
  t.v.nodes[t.p].dialogue = [{ role: 'model', text: 'Claim', at: t.v.nodes[t.p].createdAt, author: { kind: 'model', model: 'm', generationId: 'g' } }];
  expect(ask('check', t.p, { turn: 0 }).prompt).toContain('TASK: check the reply shown as TURN TO CHECK'); expect(ask('check', t.p).prompt).toContain('TASK: check the product "Bambu A1"');
  expect(ask('check', t.crit).prompt).toContain('TASK: check the criterion "Build volume" for every product');
  expect(ask('check', t.concept).prompt).toMatch(/the cells block \(a criterion's row, only cells of the COMPARE block\)\.$/);
  expect(ask('recommend', t.root).prompt).toMatch(/"product" an id of the SHORTLIST or null, "confidence" and "missing"\.$/);
});

test('CP-20: the system prompt follows the web flag and the visit tone, not the task', () => {
  const t = printer();
  const a = taskPrompt(t.v, 'light', t.concept, { today, web: false }), b = taskPrompt(t.v, 'more', t.concept, { today, web: false }), c = taskPrompt(t.v, 'light', t.concept, { today, web: true });
  expect(a.system).toBe(b.system); expect(a.system).not.toBe(c.system); expect(a.system).toContain('Be warm and conversational');
  t.v.data = { ...t.v.data, tone: 'engineer' }; expect(taskPrompt(t.v, 'light', t.concept, { today, web: false }).system).toContain('Be precise and practical');
  expect(() => taskPrompt(t.v, 'light', 'ghost', { today, web: false })).toThrow();
});
