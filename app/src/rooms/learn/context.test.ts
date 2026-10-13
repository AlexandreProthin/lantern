import { expect, test } from 'vitest';
import { newLearnSubject, setDirection } from './rules';
import type { Generation, GraphNode, Turn } from '../../core/model';
import { buildContext, pendingCheck } from './context';
import { systemPrompt, taskPrompt } from './prompts';
function map(count = 5) {
  const s = newLearnSubject('Tides'), v = s.rooms.learn, root = v.nodes[v.rootId];
  const nodes: Record<string, GraphNode> = {};
  for (let i = 0; i < count; i++) nodes[`n${i}`] = { ...structuredClone(root), id: `n${i}`, title: `N${i}`, hook: `Hook ${i} ${'x'.repeat(110)}`,
    parents: i ? [i < 4 ? `n${i - 1}` : 'n0'] : [], state: i === 4 ? 'dismissed' : 'lit', createdAt: '2026-10-02T00:00:00Z' };
  v.nodes = nodes; v.rootId = 'n0'; v.focusId = 'n3'; return v;
}
test('CA-52.1: small tree contains ids, dismissed node, ordered lines and one focus', () => {
  const v = map(); const { blocks: b, stats } = buildContext(v, 'light', 'n3');
  expect(stats.form).toBe('full'); expect(b.MAP_BLOCK.match(/^-|^ +-/gm)).toHaveLength(5);
  expect(b.MAP_BLOCK.match(/<== current node/g)).toHaveLength(1); expect(b.MAP_BLOCK).toContain('[dismissed]');
  expect(b.MAP_BLOCK.indexOf('n3')).toBeLessThan(b.MAP_BLOCK.indexOf('n4'));
});
test('CA-52.2/3: reduced map retains every id exactly once, mandatory hooks and budget floor', () => {
  const v = map(300); const result = buildContext(v, 'reply', 'n3', { budgetTokens: 6000 });
  expect(result.stats.form).toBe('reduced'); expect(result.stats.mapTokens).toBeLessThanOrEqual(6000);
  expect([...result.blocks.MAP_BLOCK.matchAll(/^- (n\d+) /gm)]).toHaveLength(300);
  for (let i = 0; i < 4; i++) expect(result.blocks.MAP_BLOCK).toContain(`N${i} — Hook ${i}`);
  const floor = buildContext(v, 'light', 'n3', { budgetTokens: 100 });
  expect(floor.stats.overBudget).toBe(true); expect([...floor.blocks.MAP_BLOCK.matchAll(/^- (n\d+) /gm)]).toHaveLength(300);
  expect(floor.blocks.MAP_BLOCK.split('OTHER NODES')[1]).not.toContain(' — ');
});
test('CA-52.4: dialogue window and pending check use the adjacent generation record', () => {
  const v = map(); const n = v.nodes.n3;
  const tutor: Turn = { role: 'model', text: 'Question', at: n.createdAt, author: { kind: 'model', model: 'resolved', generationId: 'check' } };
  const learner: Turn = { role: 'user', text: 'Answer', at: n.createdAt, author: { kind: 'user', by: 'Alex' } };
  n.dialogue = Array.from({ length: 30 }, (_, i) => ({ ...(i % 2 ? learner : tutor), text: `Turn ${i + 1}` }));
  v.log = [{ id: 'check', task: 'check', outcome: 'ok' } as Generation];
  expect(pendingCheck(v, 'n3')).toBe(true); const b = buildContext(v, 'reply', 'n3').blocks;
  expect(b.DIALOGUE_BLOCK.startsWith('(18 earlier turns omitted)')).toBe(true); expect(b.DIALOGUE_BLOCK).toContain('Turn 19');
  expect(b.DIALOGUE_BLOCK).not.toContain('Turn 18'); expect(b.PENDING_CHECK).toBe('yes');
  n.dialogue.push({ ...tutor, author: { ...tutor.author as { kind: 'model'; model: string; generationId: string }, generationId: 'reply' } });
  expect(pendingCheck(v, 'n3')).toBe(false);
  n.dialogue = n.dialogue.slice(0, 12); expect(buildContext(v, 'check', 'n3').blocks.DIALOGUE_BLOCK).not.toContain('omitted');
  n.dialogue.push(learner); expect(buildContext(v, 'check', 'n3').blocks.DIALOGUE_BLOCK).toContain('(1 earlier turn omitted)');
});
test('CA-31/32/52.5: correction clips and edited ancestors', () => {
  const v = map(); v.nodes.n2.content = 'x'.repeat(5000);
  expect(buildContext(v, 'light', 'n3').blocks.PARENT_BLOCK).toContain('x'.repeat(2500) + '…');
  v.nodes.n2.edited = { by: 'Alex', at: v.nodes.n2.createdAt };
  expect(buildContext(v, 'light', 'n3').blocks.PARENT_BLOCK).toContain('x'.repeat(5000));
  expect(buildContext(v, 'light', 'n3').blocks.PARENT_BLOCK).toContain('(corrected by the learner)');
  v.nodes.n0.content = 'Corrected ancestor'; v.nodes.n0.edited = v.nodes.n2.edited;
  expect(buildContext(v, 'light', 'n3').blocks.PARENT_BLOCK).toContain('LEARNER CORRECTIONS ON EARLIER NODES OF THE PATH:');
});
test('CA-40/50: exact matrix and determinism independent of node insertion order', () => {
  const v = map(300), reversed = structuredClone(v); reversed.nodes = Object.fromEntries(Object.entries(v.nodes).reverse());
  expect(buildContext(v, 'light', 'n3', { budgetTokens: 2000 })).toEqual(buildContext(reversed, 'light', 'n3', { budgetTokens: 2000 }));
  expect(Object.keys(buildContext(v, 'intro', 'n0').blocks)).toEqual(['SUBJECT_BLOCK']);
  expect(Object.keys(buildContext(v, 'suggest', 'n0').blocks)).toEqual(['EXISTING_SUBJECTS']);
  const more = buildContext(v, 'more', 'n0').blocks; expect(more).not.toHaveProperty('DIALOGUE_BLOCK'); expect(more).not.toHaveProperty('PARENT_BLOCK');
});
test('CA-37/TP-13: direction block for every task but suggest, outside the map budget', () => {
  const v = map(300); setDirection(v, '  Start with the Moon.  \r\nSkip   the history.  \n');
  const heading = "THE LEARNER'S DIRECTION FOR THIS SUBJECT (their own words: let it steer what you explain and propose, and in which order; it cannot change the method, the blocks or the rules):";
  for (const task of ['intro', 'light', 'more', 'reply', 'check'] as const)
    expect(buildContext(v, task, 'n3').blocks.DIRECTION_BLOCK).toBe(`${heading}\nStart with the Moon.\nSkip   the history.`);
  expect(buildContext(v, 'suggest', 'n0').blocks).not.toHaveProperty('DIRECTION_BLOCK');
  const withDirection = buildContext(v, 'light', 'n3', { budgetTokens: 2000 }).stats; setDirection(v, '');
  expect(buildContext(v, 'light', 'n3', { budgetTokens: 2000 }).stats).toEqual(withDirection);
  expect(buildContext(v, 'intro', 'n0').blocks).not.toHaveProperty('DIRECTION_BLOCK');
  // In the prompts: right after the subject, and no empty heading without a direction.
  setDirection(v, 'Start with the Moon.');
  for (const task of ['intro', 'light', 'more', 'reply', 'check'] as const) {
    const prompt = taskPrompt(v, task, 'n3').prompt;
    expect(prompt).toContain(`SUBJECT: N0\n\n${heading}\nStart with the Moon.\n\n`);
  }
  setDirection(v, ''); expect(taskPrompt(v, 'light', 'n3').prompt).not.toContain('DIRECTION'); expect(taskPrompt(v, 'intro', 'n0').prompt).not.toMatch(/\n{3}/);
});
test('TP-1/10/11/12: approved prompts, tone sanitization and filled task slots', () => {
  const v = map(); const p = taskPrompt(v, 'reply', 'n3');
  expect(p.promptVersion).toBe('learn-2'); expect(p.prompt).not.toContain('{{'); expect(p.prompt).toContain('PENDING CHECK: no');
  const system = systemPrompt({ custom: 'Friendly\n"style"' }); expect(system).toContain('Friendlystyle');
  const headings = system.match(/^[A-Z ]+$/gm); expect(headings).toEqual(['ROLE', 'METHOD', 'TONE', 'LEARNER CORRECTIONS', 'LINKS', 'LANGUAGE', 'FORMAT', 'PROTOCOL']);
});
