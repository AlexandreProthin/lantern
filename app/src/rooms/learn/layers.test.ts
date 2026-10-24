import { expect, test } from 'vitest';
import { newLearnSubject, setDirection } from './rules';
import type { GraphNode } from '../../core/model';
import { taskPrompt } from './prompts';

/** A small map: n0 > n1 > n2 > n3 lit, n4 dismissed, with texts and a dialogue on n3. */
function visit(count = 5) {
  const s = newLearnSubject('Tides'), v = s.rooms.learn, root = v.nodes[v.rootId];
  const nodes: Record<string, GraphNode> = {};
  for (let i = 0; i < count; i++) nodes[`n${i}`] = { ...structuredClone(root), id: `n${i}`, title: `N${i}`, hook: `Hook ${i}`,
    parents: i ? [i < 4 ? `n${i - 1}` : 'n0'] : [], state: i === 4 ? 'dismissed' : 'lit', createdAt: '2026-10-02T00:00:00Z' };
  v.nodes = nodes; v.rootId = 'n0'; v.focusId = 'n3';
  nodes.n2.content = 'Parent text.\n\n\n\nWith a gap.'; nodes.n3.content = 'Own text.';
  nodes.n0.content = 'Root, corrected.'; nodes.n0.edited = { by: 'Alex', at: nodes.n0.createdAt };
  nodes.n3.dialogue = [{ role: 'user', text: 'Why?\n\n\n\nReally?', at: nodes.n3.createdAt, author: { kind: 'user', by: 'Alex' } }];
  setDirection(v, 'Start with the Moon.');
  return v;
}

test('DC-22: every Learn layer is a verbatim part of the prompt, in the order of the prompt, and TASK ends it', () => {
  for (const [v, budget] of [[visit(), 12_000], [visit(200), 600]] as const) {
    for (const task of ['intro', 'light', 'more', 'reply', 'check', 'rewrite'] as const) {
      const focus = task === 'intro' ? 'n0' : 'n3', p = taskPrompt(v, task, focus, { budgetTokens: budget, note: task === 'rewrite' ? 'Shorter, please' : undefined });
      const names = p.layers.map(l => l.name);
      expect(names[0], task).toBe('SUBJECT'); expect(names).toContain('DIRECTION'); expect(names.at(-1)).toBe('TASK');
      for (const layer of p.layers) expect(p.prompt, `${task}: ${layer.name}`).toContain(layer.text);
      expect(p.prompt.endsWith(p.layers.at(-1)!.text)).toBe(true);
      const at = p.layers.filter(l => l.name !== 'TASK').map(l => p.prompt.indexOf(l.text));
      expect(at).toEqual([...at].sort((a, b) => a - b));
    }
  }
  const v = visit();
  expect(taskPrompt(v, 'light', 'n3').layers.map(l => l.name)).toEqual(['SUBJECT', 'DIRECTION', 'MAP', 'PATH', 'PARENT', 'TASK']);
  expect(taskPrompt(v, 'more', 'n3').layers.map(l => l.name)).toEqual(['SUBJECT', 'DIRECTION', 'MAP', 'PATH', 'FOCUS', 'EXISTING_CHILDREN', 'TASK']);
  expect(taskPrompt(v, 'reply', 'n3').layers.map(l => l.name)).toContain('DIALOGUE');
  expect(taskPrompt(v, 'intro', 'n0').layers.map(l => l.name)).toEqual(['SUBJECT', 'DIRECTION', 'TASK']);
  expect(taskPrompt(visit(200), 'light', 'n3', { budgetTokens: 600 }).stats.form).toBe('reduced');
});
test('DC-22: the suggest layers are in its prompt too', () => {
  const v = visit(), p = taskPrompt(v, 'suggest', v.rootId, { existingSubjects: ['Stars', 'Rust'], hint: 'space' });
  expect(p.layers.map(l => l.name)).toEqual(['EXISTING_SUBJECTS', 'TASK']);
  for (const layer of p.layers) expect(p.prompt).toContain(layer.text);
});
test('DC-20/21/30: a traced Learn session records the action, then the tagged call with all its layers found, then what it kept', async () => {
  const { trace, TracedProvider } = await import('../../frame/debug/trace.svelte');
  const { FakeProvider } = await import('./fake-provider');
  const { LearnSession } = await import('./session');
  trace.setEnabled(true);
  try {
    const s = newLearnSubject('Tides'), session = new LearnSession(s, new TracedProvider(new FakeProvider(0)), () => {});
    await session.run('intro', session.visit.rootId);
    const child = Object.values(session.visit.nodes).find(n => n.kind === 'axis')!;
    await session.run('light', child.id); await session.run('reply', child.id, 'Why?');
    const calls = trace.entries.filter(e => e.kind === 'call');
    expect(calls.map(c => c.origin)).toEqual(['learn·intro', 'learn·light', 'learn·reply']);
    expect(trace.entries.flatMap(e => e.kind === 'action' ? [e.summary] : [])).toEqual(['Introduce subject', 'Light node', 'Send reply']);
    expect(trace.entries[0].kind).toBe('action');
    for (const c of calls) {
      if (c.kind !== 'call') continue;
      expect(c.missingLayers, c.origin).toEqual([]); expect(c.tag).toMatchObject({ subjectId: s.id, promptVersion: 'learn-3' });
      expect(c.tag?.layers?.length).toBeGreaterThan(1); expect(c.parsed).toHaveProperty('visibleChars');
    }
  } finally { trace.setEnabled(false); }
});
