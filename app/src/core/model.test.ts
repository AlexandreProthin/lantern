import { describe, expect, test } from 'vitest';
import { convertV1, createSubject, now, parseSubject, validateVisit, visitSummary } from './model';
import type { Generation, Turn } from './model';
import { addChild, childrenOf, deleteSubtree, editText, pathTo, revertText } from './graph';
import { stats } from '../rooms/learn/stats';
import { addLearnChild, directionOf, newLearnSubject, setDirection, setState, understoodBy, validateLearn } from '../rooms/learn/rules';

const setup = () => { const s = newLearnSubject('Marées', undefined, 'Alex'); return { s, v: s.rooms.learn, root: s.rooms.learn.nodes[s.rooms.learn.rootId] }; };
const generation = (id: string, model: string, output = 10): Generation => ({ id, nodeId: 'deleted-node', task: 'light', model, effort: 'medium', data: { tone: 'curious' }, promptVersion: 'learn-1', startedAt: '2026-10-02T12:00:00Z', durationMs: 100,
  usage: { input: 20, output, thinking: 5, cacheRead: 1000, cacheWrite: 2000 }, outcome: 'cancelled' });
describe('DM/ST domain', () => {
  test('DM-1/ST-4: fresh subject defaults, safe id and exact JSON round-trip', () => {
    const { s } = setup(); expect(s.id).toMatch(/^marees-[a-z0-9]{4}$/); expect(s.format).toBe('lantern/2');
    expect(parseSubject(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(s.rooms.learn.model).toBe('opus'); expect(s.rooms.learn.effort).toBe('medium'); expect(s.rooms.learn.data).toEqual({ tone: 'curious' });
    expect(s.rooms.learn.nodes[s.rooms.learn.rootId].createdBy).toBe('user');
  });
  test('DM-50..55: rejects detached trees, cycles, multiple parents and map/id mismatch', () => {
    const { s, v, root } = setup(); setState(v, root.id, 'lit');
    const a = addLearnChild(v, root.id, { title: 'A', kind: 'axis', createdBy: 'model' });
    for (const parents of [[], ['absent'], [root.id, root.id], [a.id]]) {
      const copy = structuredClone(s); copy.rooms.learn.nodes[a.id].parents = parents;
      expect(() => parseSubject(copy)).toThrow();
    }
    a.id = root.id; expect(() => validateVisit(v)).toThrow();
  });
  test('DM-62/63/66: the core accepts any room kind and state but checks roles and data', () => {
    const s = createSubject('Printer', 'choose', { model: 'opus', effort: 'low', data: { status: 'exploring' }, root: { kind: 'subject', state: 'open' } });
    const v = s.rooms.choose; addChild(v, v.rootId, { title: 'Bambu A1', kind: 'product', state: 'candidate', createdBy: 'model' });
    expect(() => parseSubject(s)).not.toThrow();
    const bad = structuredClone(s); (bad.rooms.choose.nodes[v.rootId] as { createdBy: string }).createdBy = 'tutor'; expect(() => parseSubject(bad)).toThrow();
    const badData = structuredClone(s); (badData.rooms.choose as { data: unknown }).data = []; expect(() => parseSubject(badData)).toThrow();
  });
  test('DM-14/15/LR-38: state transitions and understanding provenance', () => {
    const { v, root } = setup(); setState(v, root.id, 'dismissed'); setState(v, root.id, 'open');
    expect(() => setState(v, root.id, 'understood', 'self')).toThrow();
    setState(v, root.id, 'lit'); expect(() => setState(v, root.id, 'dismissed')).toThrow();
    expect(() => setState(v, root.id, 'understood')).toThrow();
    setState(v, root.id, 'understood', 'self'); expect(root.data).toEqual({ understoodBy: 'self' }); validateLearn(v);
    setState(v, root.id, 'understood', 'demonstrated'); expect(understoodBy(root)).toBe('demonstrated');
    setState(v, root.id, 'lit'); expect(understoodBy(root)).toBeNull(); expect(root.data).toBeUndefined(); validateLearn(v);
  });
  test('LR-20/39/62: children need a lit parent; tutor dedup includes dismissed nodes', () => {
    const { v, root } = setup(); const input = { title: 'Café  chaud', kind: 'axis' as const, createdBy: 'model' as const };
    expect(() => addLearnChild(v, root.id, input)).toThrow(); setState(v, root.id, 'lit');
    const a = addLearnChild(v, root.id, input); setState(v, a.id, 'dismissed');
    expect(() => addLearnChild(v, root.id, { ...input, title: ' cafe chaud ' })).toThrow('Duplicate');
  });
  test('DM-19a: subtree deletion moves focus, preserves logs, refuses root', () => {
    const { v, root } = setup(); setState(v, root.id, 'lit');
    const a = addLearnChild(v, root.id, { title: 'A', kind: 'axis', createdBy: 'model' }); setState(v, a.id, 'lit');
    const b = addLearnChild(v, a.id, { title: 'B', kind: 'deeper', createdBy: 'model' });
    v.focusId = b.id; v.log.push(generation('g', 'resolved-model'));
    expect(pathTo(v, b.id).map(n => n.id)).toEqual([root.id, a.id, b.id]);
    expect(deleteSubtree(v, a.id)).toBe(2); expect(v.focusId).toBe(root.id); expect(v.log).toHaveLength(1);
    expect(() => deleteSubtree(v, root.id)).toThrow(); validateVisit(v); validateLearn(v);
  });
  test('DM-16/18/19: first edit keeps original; later edits and revert never generate or change state', () => {
    const { v, root } = setup(); setState(v, root.id, 'lit'); root.content = 'Original';
    root.author = { kind: 'model', model: 'resolved', effort: 'medium', generationId: 'g' };
    editText(root, 'First correction', 'Alex'); editText(root, 'Second correction', 'Alex');
    expect(root.previous).toBe('Original'); expect(root.state).toBe('lit'); expect(v.log).toEqual([]);
    revertText(root); expect(root.content).toBe('Original'); expect(root.edited).toBeUndefined();
    const t: Turn = { role: 'user', text: 'Question', at: root.createdAt, author: { kind: 'user', by: 'Alex' } };
    expect(() => editText(t, 'Changed', 'Alex')).toThrow();
    const tutor: Turn = { ...t, role: 'model', author: root.author };
    editText(tutor, 'Changed', 'Alex'); expect(tutor.previous).toBe('Question'); revertText(tutor); expect(tutor.text).toBe('Question');
  });
  test('WG-30..36: dismissed excluded; thinking/cache not double counted; outcomes all counted; ties latest', () => {
    const { v, root } = setup(); setState(v, root.id, 'lit'); setState(v, root.id, 'understood', 'self');
    const a = addLearnChild(v, root.id, { title: 'A', kind: 'axis', createdBy: 'model' }); setState(v, a.id, 'dismissed');
    v.log = [generation('g1', 'a'), { ...generation('g2', 'b'), outcome: 'error' }, { ...generation('g3', 'c'), outcome: 'ok' }];
    const summary = stats(v);
    expect(summary).toMatchObject({ total: 1, lit: 1, understood: 1, self: 1, dark: 0, tokens: 90, input: 60, output: 30, generations: 3, mainModel: 'c', progress: 1 });
    expect(summary.models.reduce((sum, m) => sum + m.share!, 0)).toBe(100);
    v.log = [generation('zero', 'a', 0)]; expect(stats(v).models[0].share).toBeNull();
  });
  test('ST-7: the room-neutral visit summary counts states, node data and short visit data', () => {
    const { v, root } = setup(); setState(v, root.id, 'lit'); setState(v, root.id, 'understood', 'demonstrated');
    addLearnChild(v, root.id, { title: 'A', kind: 'axis', createdBy: 'model' }); setDirection(v, 'x'.repeat(500));
    v.log = [generation('g1', 'a'), { ...generation('g2', 'b', 30), outcome: 'ok' }];
    expect(visitSummary(v)).toEqual({ states: { understood: 1, open: 1 }, kindStates: Object.fromEntries(Object.values(v.nodes).reduce((m, n) => m.set(n.kind, { ...m.get(n.kind), [n.state]: (m.get(n.kind)?.[n.state] ?? 0) + 1 }), new Map<string, Record<string, number>>())), nodeData: { understoodBy: { demonstrated: 1 } }, data: { tone: 'curious' },
      input: 40, output: 40, tokens: 80, mainModel: 'b', modelOutputs: { a: 10, b: 30 }, generations: 2 });
  });
});

describe('DM-68 conversion from lantern/1', () => {
  test('moves Learn fields into data, renames roles, keeps unknown fields, and is idempotent', () => {
    const v1 = { format: 'lantern/1', id: 'tides-k3f9', title: 'Tides', createdAt: '2026-10-01T20:00:00Z', future: 1, rooms: { learn: {
      tone: 'engineer', direction: 'Start from the Moon.', model: 'sonnet', effort: 'medium', focusId: 'n1', rootId: 'n1', log: [
        { id: 'g1', nodeId: 'n1', task: 'intro', model: 'm', effort: 'medium', tone: 'engineer', promptVersion: 'learn-3', startedAt: '2026-10-01T20:00:00Z', durationMs: 1,
          usage: { input: 1, output: 1, thinking: 0, cacheRead: 0, cacheWrite: 0 }, outcome: 'ok' }],
      nodes: {
        n1: { id: 'n1', parents: [], title: 'Tides', hook: '', kind: 'subject', state: 'understood', understoodBy: 'self', content: 'Text',
          author: { kind: 'model', model: 'm', generationId: 'g1' }, createdAt: '2026-10-01T20:00:05Z', createdBy: 'learner', extra: true,
          dialogue: [{ role: 'learner', text: 'Why?', at: '2026-10-01T20:02:00Z', author: { kind: 'user', by: 'alex' } },
            { role: 'tutor', text: 'Because.', at: '2026-10-01T20:03:00Z', author: { kind: 'model', model: 'm', generationId: 'g1' } }] } } } } };
    const s = parseSubject(convertV1(v1)), v = s.rooms.learn, n = v.nodes.n1;
    expect(v.data).toEqual({ tone: 'engineer', direction: 'Start from the Moon.' }); expect(directionOf(v)).toBe('Start from the Moon.');
    expect(n.data).toEqual({ understoodBy: 'self' }); expect(n.createdBy).toBe('user'); expect(n.dialogue.map(t => t.role)).toEqual(['user', 'model']);
    expect(v.log[0].data).toEqual({ tone: 'engineer' }); expect(v.log[0]).not.toHaveProperty('tone');
    expect((s as unknown as { future: number }).future).toBe(1); expect((n as unknown as { extra: boolean }).extra).toBe(true);
    validateLearn(v); expect(convertV1(s)).toBe(s);
  });
});

describe('DM-41/65 direction', () => {
  test('is optional, trimmed, kept on creation and validated on read', () => {
    const plain = newLearnSubject('Tides').rooms.learn; expect(plain.data).not.toHaveProperty('direction'); expect(() => validateLearn(plain)).not.toThrow();
    const blank = newLearnSubject('Tides', { tone: 'curious', model: 'opus', effort: 'medium', direction: '   ' }).rooms.learn;
    expect(blank.data).not.toHaveProperty('direction');
    const v = newLearnSubject('Tides', { tone: 'curious', model: 'opus', effort: 'medium', direction: '  Start with the Moon.\nSkip history.  ' }).rooms.learn;
    expect(directionOf(v)).toBe('Start with the Moon.\nSkip history.'); expect(() => validateLearn(v)).not.toThrow();
    setDirection(v, ''); expect(v.data).not.toHaveProperty('direction'); expect(() => validateLearn(v)).not.toThrow();
    v.data = { ...v.data, direction: 'é'.repeat(500) }; expect(() => validateLearn(v)).not.toThrow();
    v.data = { ...v.data, direction: 'x'.repeat(501) }; expect(() => validateLearn(v)).toThrow('Invalid Learn visit data');
    v.data = { ...v.data, direction: 3 }; expect(() => validateLearn(v)).toThrow('Invalid Learn visit data');
    expect(() => newLearnSubject('Tides', { tone: 'curious', model: 'opus', effort: 'medium', direction: 'x'.repeat(501) })).toThrow('at most 500');
  });
});

test('DM-10: timestamps strictly increase and tied siblings order by id, whatever the key order', () => {
  const stamps = Array.from({ length: 5 }, now);
  expect(stamps.every((t, i) => !i || t > stamps[i - 1])).toBe(true);
  const v = newLearnSubject('Order').rooms.learn, at = '2026-10-07T00:00:00.000Z';
  for (const id of ['b1', '12345678', 'a0']) v.nodes[id] = { ...v.nodes[v.rootId], id, parents: [v.rootId], createdAt: at };
  expect(childrenOf(v, v.rootId).map(n => n.id)).toEqual(['12345678', 'a0', 'b1']);
});
