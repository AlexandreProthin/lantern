import { describe, expect, it } from 'vitest';
import { cloneJson } from '../core/model';
import type { Generation, RoomVisit } from '../core/model';
import { newLearnSubject } from '../rooms/learn/rules';
import { LearnSession } from '../rooms/learn/session';
import { FakeProvider } from '../rooms/learn/fake-provider';
import { UndoHistory } from './undo';

const visit = () => newLearnSubject('Tides').rooms.learn;
const titled = (v: RoomVisit, title: string) => { v.nodes[v.rootId].title = title; return v; };
const titleOf = (v: RoomVisit) => v.nodes[v.rootId].title;
const generation = (id: string): Generation => ({ id, nodeId: 'n', task: 'light', model: 'm', effort: 'low', promptVersion: 'learn-3', startedAt: '2026-11-04T00:00:00Z',
  durationMs: 1, usage: { input: 1, output: 1, thinking: 0, cacheRead: 0, cacheWrite: 0 }, outcome: 'ok' });

describe('UndoHistory', () => {
  it('walks back and forward through saved states (RS-60)', () => {
    let v = visit(); const h = new UndoHistory(v), first = titleOf(v);
    h.observe(titled(v, 'Two')); h.observe(titled(v, 'Three'));
    v = h.undo(v)!; expect(titleOf(v)).toBe('Two');
    v = h.undo(v)!; expect(titleOf(v)).toBe(first);
    expect(h.undo(v)).toBeNull();
    v = h.redo(v)!; v = h.redo(v)!; expect(titleOf(v)).toBe('Three');
    expect(h.redo(v)).toBeNull();
  });

  it('keeps the log, model and effort, which are not part of a step (RS-61)', () => {
    let v = visit(); const h = new UndoHistory(v);
    h.observe(titled(v, 'Two'));
    v.log.push(generation('g1')); v.model = 'other'; v.effort = 'high';
    v = h.undo(v)!;
    expect(v.log.map(g => g.id)).toEqual(['g1']); expect(v.model).toBe('other'); expect(v.effort).toBe('high');
  });

  it('a save that changes only the focus, the log or the settings is no step (RS-61)', () => {
    const v = visit(), h = new UndoHistory(v);
    v.log.push(generation('g1')); h.observe(v);
    v.model = 'other'; h.observe(v);
    expect(h.undo(v)).toBeNull();
  });

  it('returns the focus to where it was, or to the root when that node no longer exists (RS-61)', () => {
    let v = visit(); v.nodes.a = { ...cloneJson(v.nodes[v.rootId]), id: 'a', parents: [v.rootId] };
    const h = new UndoHistory(v);
    v.focusId = 'a'; h.observe(v);
    delete v.nodes.a; v.focusId = v.rootId; h.observe(v);
    v = h.undo(v)!; expect(v.focusId).toBe('a'); expect(v.nodes.a).toBeDefined();
    v = h.redo(v)!; expect(v.focusId).toBe(v.rootId); expect(v.nodes.a).toBeUndefined();
  });

  it('a new change ends what could be redone (RS-60)', () => {
    let v = visit(); const h = new UndoHistory(v);
    h.observe(titled(v, 'Two')); v = h.undo(v)!;
    h.observe(titled(v, 'Other'));
    expect(h.redo(v)).toBeNull();
  });

  it('seeing the restored state again adds no step, so redo survives its own save', () => {
    let v = visit(); const h = new UndoHistory(v);
    h.observe(titled(v, 'Two')); v = h.undo(v)!; h.observe(v);
    v = h.redo(v)!; expect(titleOf(v)).toBe('Two');
  });

  it('keeps at most its limit of steps (RS-62)', () => {
    let v = visit(); const h = new UndoHistory(v, 2);
    for (const title of ['Two', 'Three', 'Four']) h.observe(titled(v, title));
    v = h.undo(v)!; v = h.undo(v)!; expect(titleOf(v)).toBe('Two');
    expect(h.undo(v)).toBeNull();
  });

  it('reset forgets every step (RS-63)', () => {
    const v = visit(), h = new UndoHistory(v);
    h.observe(titled(v, 'Two')); h.reset(v);
    expect(h.undo(v)).toBeNull(); expect(h.redo(v)).toBeNull();
  });

  it('undoes a whole generation, with the tokens it spent still logged (RS-61)', async () => {
    const s = newLearnSubject('Tides'); let h: UndoHistory | undefined;
    const session = new LearnSession(s, new FakeProvider(0), () => h?.observe(s.rooms.learn));
    h = new UndoHistory(s.rooms.learn);
    await session.run('intro', session.visit.rootId);
    const grown = Object.keys(session.visit.nodes).length, spent = session.visit.log.length;
    expect(grown).toBeGreaterThan(1); expect(spent).toBe(1);
    s.rooms.learn = h.undo(session.visit)!;
    expect(Object.keys(session.visit.nodes)).toHaveLength(1);
    expect(session.visit.nodes[session.visit.rootId].state).toBe('open');
    expect(session.visit.log).toHaveLength(spent);
    s.rooms.learn = h.redo(session.visit)!;
    expect(Object.keys(session.visit.nodes)).toHaveLength(grown);
  });
});
