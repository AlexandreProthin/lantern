import { describe, expect, test } from 'vitest';
import { createSubject, now, parseSubject, validateVisit } from './model';
import type { Generation, Turn } from './model';
import { addChild, childrenOf, deleteSubtree, editText, pathTo, revertText, setState } from './graph';
import { stats } from './stats';

const setup = () => { const s = createSubject('Marées', 'learn', undefined, 'Alex'); return { s, v: s.rooms.learn, root: s.rooms.learn.nodes[s.rooms.learn.rootId] }; };
const generation = (id: string, model: string, output = 10): Generation => ({ id, nodeId: 'deleted-node', task: 'light', model, effort: 'medium', tone: 'curious', promptVersion: 'learn-1', startedAt: '2026-10-02T12:00:00Z', durationMs: 100,
  usage: { input: 20, output, thinking: 5, cacheRead: 1000, cacheWrite: 2000 }, outcome: 'cancelled' });
describe('DM/ST domain', () => {
  test('DM-1/ST-4: fresh subject defaults, safe id and exact JSON round-trip', () => {
    const { s } = setup(); expect(s.id).toMatch(/^marees-[a-z0-9]{4}$/);
    expect(parseSubject(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(s.rooms.learn.model).toBe('opus'); expect(s.rooms.learn.effort).toBe('medium');
  });
  test('DM-50..55: rejects detached trees, cycles, multiple parents and map/id mismatch', () => {
    const { s, v, root } = setup(); setState(v, root.id, 'lit');
    const a = addChild(v, root.id, { title: 'A', kind: 'axis', createdBy: 'tutor' });
    for (const parents of [[], ['absent'], [root.id, root.id], [a.id]]) {
      const copy = structuredClone(s); copy.rooms.learn.nodes[a.id].parents = parents;
      expect(() => parseSubject(copy)).toThrow();
    }
    a.id = root.id; expect(() => validateVisit(v)).toThrow();
  });
  test('DM-14/15/LR-38: state transitions and understanding provenance', () => {
    const { v, root } = setup(); setState(v, root.id, 'dismissed'); setState(v, root.id, 'open');
    expect(() => setState(v, root.id, 'understood', 'self')).toThrow();
    setState(v, root.id, 'lit'); expect(() => setState(v, root.id, 'dismissed')).toThrow();
    expect(() => setState(v, root.id, 'understood')).toThrow();
    setState(v, root.id, 'understood', 'self'); setState(v, root.id, 'understood', 'demonstrated');
    setState(v, root.id, 'lit'); expect(root.understoodBy).toBeNull();
  });
  test('LR-20/39/62: children need a lit parent; tutor dedup includes dismissed nodes', () => {
    const { v, root } = setup(); const input = { title: 'Café  chaud', kind: 'axis' as const, createdBy: 'tutor' as const };
    expect(() => addChild(v, root.id, input)).toThrow(); setState(v, root.id, 'lit');
    const a = addChild(v, root.id, input); setState(v, a.id, 'dismissed');
    expect(() => addChild(v, root.id, { ...input, title: ' cafe chaud ' })).toThrow('Duplicate');
  });
  test('DM-19a: subtree deletion moves focus, preserves logs, refuses root', () => {
    const { v, root } = setup(); setState(v, root.id, 'lit');
    const a = addChild(v, root.id, { title: 'A', kind: 'axis', createdBy: 'tutor' }); setState(v, a.id, 'lit');
    const b = addChild(v, a.id, { title: 'B', kind: 'deeper', createdBy: 'tutor' });
    v.focusId = b.id; v.log.push(generation('g', 'resolved-model'));
    expect(pathTo(v, b.id).map(n => n.id)).toEqual([root.id, a.id, b.id]);
    expect(deleteSubtree(v, a.id)).toBe(2); expect(v.focusId).toBe(root.id); expect(v.log).toHaveLength(1);
    expect(() => deleteSubtree(v, root.id)).toThrow(); validateVisit(v);
  });
  test('DM-16/18/19: first edit keeps original; later edits and revert never generate or change state', () => {
    const { v, root } = setup(); setState(v, root.id, 'lit'); root.content = 'Original';
    root.author = { kind: 'model', model: 'resolved', effort: 'medium', generationId: 'g' };
    editText(root, 'First correction', 'Alex'); editText(root, 'Second correction', 'Alex');
    expect(root.previous).toBe('Original'); expect(root.state).toBe('lit'); expect(v.log).toEqual([]);
    revertText(root); expect(root.content).toBe('Original'); expect(root.edited).toBeUndefined();
    const t: Turn = { role: 'learner', text: 'Question', at: root.createdAt, author: { kind: 'user', by: 'Alex' } };
    expect(() => editText(t, 'Changed', 'Alex')).toThrow();
    const tutor: Turn = { ...t, role: 'tutor', author: root.author };
    editText(tutor, 'Changed', 'Alex'); expect(tutor.previous).toBe('Question'); revertText(tutor); expect(tutor.text).toBe('Question');
  });
  test('WG-30..36: dismissed excluded; thinking/cache not double counted; outcomes all counted; ties latest', () => {
    const { v, root } = setup(); setState(v, root.id, 'lit'); setState(v, root.id, 'understood', 'self');
    const a = addChild(v, root.id, { title: 'A', kind: 'axis', createdBy: 'tutor' }); setState(v, a.id, 'dismissed');
    v.log = [generation('g1', 'a'), { ...generation('g2', 'b'), outcome: 'error' }, { ...generation('g3', 'c'), outcome: 'ok' }];
    const summary = stats(v);
    expect(summary).toMatchObject({ total: 1, lit: 1, understood: 1, self: 1, dark: 0, tokens: 90, input: 60, output: 30, generations: 3, mainModel: 'c', progress: 1 });
    expect(summary.models.reduce((sum, m) => sum + m.share!, 0)).toBe(100);
    v.log = [generation('zero', 'a', 0)]; expect(stats(v).models[0].share).toBeNull();
  });
});

describe('DM-41 direction', () => {
  test('is optional, trimmed, kept on creation and validated on read', () => {
    const plain = createSubject('Tides').rooms.learn; expect(plain).not.toHaveProperty('direction'); expect(() => validateVisit(plain)).not.toThrow();
    const blank = createSubject('Tides', 'learn', { tone: 'curious', model: 'opus', effort: 'medium', direction: '   ' }).rooms.learn;
    expect(blank).not.toHaveProperty('direction');
    const v = createSubject('Tides', 'learn', { tone: 'curious', model: 'opus', effort: 'medium', direction: '  Start with the Moon.\nSkip history.  ' }).rooms.learn;
    expect(v.direction).toBe('Start with the Moon.\nSkip history.'); expect(() => validateVisit(v)).not.toThrow();
    v.direction = ''; expect(() => validateVisit(v)).not.toThrow();
    v.direction = 'é'.repeat(500); expect(() => validateVisit(v)).not.toThrow();
    v.direction = 'x'.repeat(501); expect(() => validateVisit(v)).toThrow('Invalid room visit');
    (v as { direction?: unknown }).direction = 3; expect(() => validateVisit(v)).toThrow('Invalid room visit');
    expect(() => createSubject('Tides', 'learn', { tone: 'curious', model: 'opus', effort: 'medium', direction: 'x'.repeat(501) })).toThrow('at most 500');
  });
});

test('DM-10: timestamps strictly increase and tied siblings order by id, whatever the key order', () => {
  const stamps = Array.from({ length: 5 }, now);
  expect(stamps.every((t, i) => !i || t > stamps[i - 1])).toBe(true);
  const v = createSubject('Order').rooms.learn, at = '2026-10-07T00:00:00.000Z';
  for (const id of ['b1', '12345678', 'a0']) v.nodes[id] = { ...v.nodes[v.rootId], id, parents: [v.rootId], createdAt: at };
  expect(childrenOf(v, v.rootId).map(n => n.id)).toEqual(['12345678', 'a0', 'b1']);
});
