import { describe, expect, it } from 'vitest';
import { addChild } from '../../core/graph';
import { cloneJson, parseSubject } from '../../core/model';
import type { RoomVisit } from '../../core/model';
import { shownIds } from '../../core/visibility';
import { FakeProvider } from './fake-provider';
import { LearnSession } from './session';
import { nodeActions, runNodeAction } from './actions';
import { isDeadEnd, isPrepared, newLearnSubject, opensChildren, progressSnapshot, resetProgress, restoreProgress, setDeadEnd, understoodBy, validateLearn } from './rules';

const authored = (generationId = 'authored-1') => ({ kind: 'model' as const, model: 'claude-opus-5-5', effort: 'high' as const, generationId });
/** A prepared course: root lit; A (prepared, with child A1 prepared); B (prepared leaf); C (prepared leaf, dead end). */
function course() {
  const s = newLearnSubject('Course'), v = s.rooms.learn, root = v.nodes[v.rootId];
  Object.assign(root, { state: 'lit', content: 'Welcome to the course.', author: authored() });
  const add = (parent: string, title: string) => { const n = addChild(v, parent, { title, kind: 'axis', state: 'open', createdBy: 'model' }); Object.assign(n, { content: `About ${title}.`, author: authored() }); return n.id; };
  const ids = { root: v.rootId, a: add(v.rootId, 'A'), b: add(v.rootId, 'B'), c: add(v.rootId, 'C'), a1: '' };
  ids.a1 = add(ids.a, 'A1'); setDeadEnd(v, ids.c, true);
  const provider = new FakeProvider(0), session = new LearnSession(s, provider, () => {});
  session.replayMs = 0;
  return { s, v: () => session.visit, ids, provider, session };
}

describe('prepared nodes (DM-70, LR-90..95)', () => {
  it('a hand-written file validates, with model authors whose ids have no record (DM-17a)', () => {
    const { s } = course();
    expect(() => validateLearn(parseSubject(cloneJson(s)).rooms.learn)).not.toThrow();
  });

  it('shows the root and its children, then the rest as nodes light', async () => {
    const { v, ids, session } = course();
    expect([...shownIds(v(), opensChildren)].sort()).toEqual([ids.root, ids.a, ids.b, ids.c].sort());
    expect(isPrepared(v().nodes[ids.a])).toBe(true);
    await session.run('light', ids.a);
    expect(shownIds(v(), opensChildren).has(ids.a1)).toBe(true);
  });

  it('with stored children: replays, no call, no record, nothing changed but the state', async () => {
    const { v, ids, session } = course(), before = cloneJson(v().nodes[ids.a]);
    let calls = 0; session['provider'] = { stream: async () => { calls++; throw new Error('no call expected'); } };
    await session.run('light', ids.a);
    expect(calls).toBe(0); expect(v().log).toHaveLength(0);
    expect(v().nodes[ids.a]).toEqual({ ...before, state: 'lit' });
    expect(session.running).toBeNull();
  });

  it('a prepared leaf asks for 3 directions after the replay; the record is the more call only', async () => {
    const { v, ids, session } = course();
    await session.run('light', ids.b);
    expect(v().nodes[ids.b].state).toBe('lit');
    expect(v().log.map(g => g.task)).toEqual(['more']);
    expect(Object.values(v().nodes).filter(n => n.parents[0] === ids.b)).toHaveLength(3);
  });

  it('a prepared dead end replays and stops; More options is refused and disabled; a branch is dropped', async () => {
    const { v, ids, session, provider } = course();
    await session.run('light', ids.c);
    expect(v().nodes[ids.c].state).toBe('lit'); expect(v().log).toHaveLength(0);
    await expect(session.run('more', ids.c)).rejects.toThrow('dead end');
    const more = nodeActions(v(), v().nodes[ids.c], null).find(a => a.id === 'more')!;
    expect(more.disabled).toBe(true); expect(more.title).toBeTruthy();
    provider.response = 'A good question. <branch>{"title":"A side road","hook":"x"}</branch>';
    await session.run('reply', ids.c, 'And what about this?');
    expect(v().nodes[ids.c].dialogue).toHaveLength(2);
    expect(Object.values(v().nodes).some(n => n.title === 'A side road')).toBe(false);
  });

  it('a replay is skipped, never cancelled, and keeps the dialogue as it was', async () => {
    const { v, ids, session } = course();
    v().nodes[ids.a].dialogue.push({ role: 'user', text: 'Earlier question', at: new Date().toISOString(), author: { kind: 'user', by: 'me' } });
    session.replayMs = 60_000;
    const lighting = session.run('light', ids.a);
    expect(session.running).toMatchObject({ replay: true, reveal: 1, task: 'light' });
    session.cancel(); await lighting;
    expect(v().nodes[ids.a].state).toBe('lit'); expect(v().nodes[ids.a].dialogue).toHaveLength(1); expect(v().log).toHaveLength(0);
  });

  it('a replay whose node is deleted meanwhile writes nothing', async () => {
    const { v, ids, session } = course();
    session.replayMs = 60_000;
    const lighting = session.run('light', ids.b);
    delete v().nodes[ids.b]; session.skip(); await lighting;
    expect(v().nodes[ids.b]).toBeUndefined(); expect(v().log).toHaveLength(0);
  });

  it('the root of a darkened subject replays as an intro', async () => {
    const { v, ids, session } = course();
    resetProgress(v(), new Date().toISOString());
    session.replayMs = 60_000;
    const lighting = session.run('light', ids.root);
    expect(session.running?.task).toBe('intro'); session.skip(); await lighting;
    expect(v().nodes[ids.root].state).toBe('lit'); expect(v().log).toHaveLength(0);
  });

  it('More options on the root gives axes (LR-17, LR-90)', async () => {
    const { v, ids, session } = course();
    await session.run('more', ids.root);
    expect(Object.values(v().nodes).filter(n => n.parents[0] === ids.root).every(n => n.kind === 'axis')).toBe(true);
  });
});

describe('dead ends (LR-100..102)', () => {
  it('toggles from the shared action list, on every state but dismissed', () => {
    const { v, ids, session } = course();
    const toggle = (id: string) => nodeActions(v(), v().nodes[id], null).find(a => a.id === 'deadend');
    expect(toggle(ids.b)?.label).toBe('Mark as dead end'); expect(toggle(ids.c)?.label).toBe('Not a dead end');
    runNodeAction(session, 'deadend', ids.b); expect(isDeadEnd(v().nodes[ids.b])).toBe(true);
    runNodeAction(session, 'deadend', ids.b); expect(v().nodes[ids.b].data).toBeUndefined();
    v().nodes[ids.b].state = 'dismissed'; expect(toggle(ids.b)).toBeUndefined();
  });
  it('validation keeps only `true`', () => {
    const { v, ids } = course();
    v().nodes[ids.b].data = { deadEnd: false }; expect(() => validateLearn(v())).toThrow('dead-end');
  });
});

describe('Replay from the start and Restore progress (LR-110..115)', () => {
  async function progressed() {
    const c = course();
    await c.session.run('light', c.ids.a); await c.session.run('light', c.ids.a1);
    const a = c.v().nodes[c.ids.a]; a.state = 'understood'; a.data = { understoodBy: 'self' };
    c.v().focusId = c.ids.a1;
    return c;
  }
  it('darkens every lit node, keeps the rest, saves a snapshot and focuses the root', async () => {
    const { v, ids } = await progressed(), before = cloneJson(v());
    expect(resetProgress(v(), '2026-11-12T10:00:00.000Z')).toBe(3);
    for (const id of [ids.root, ids.a, ids.a1]) { expect(v().nodes[id].state).toBe('open'); expect(isPrepared(v().nodes[id])).toBe(true); }
    expect(understoodBy(v().nodes[ids.a])).toBeNull();
    expect(v().nodes[ids.c].data).toEqual({ deadEnd: true });
    expect(v().focusId).toBe(ids.root);
    expect(progressSnapshot(v())).toEqual({ at: '2026-11-12T10:00:00.000Z', nodes: { [ids.root]: { state: 'lit' }, [ids.a]: { state: 'understood', understoodBy: 'self' }, [ids.a1]: { state: 'lit' } } });
    for (const id of Object.keys(before.nodes)) expect(v().nodes[id].content).toBe(before.nodes[id].content);
    expect(() => validateLearn(v())).not.toThrow();
    expect([...shownIds(v(), opensChildren)]).toEqual([ids.root]);
  });

  it('restores from the root down, never lowers, skips what changed since, and forgets the snapshot', async () => {
    const { v, ids, session } = await progressed();
    resetProgress(v(), new Date().toISOString());
    await session.run('light', ids.root); // progress after the reset
    v().nodes[ids.b].state = 'dismissed';
    expect(restoreProgress(v())).toBe(2);
    expect(v().nodes[ids.root].state).toBe('lit');
    expect(v().nodes[ids.a]).toMatchObject({ state: 'understood', data: { understoodBy: 'self' } });
    expect(v().nodes[ids.a1].state).toBe('lit');
    expect(v().nodes[ids.b].state).toBe('dismissed');
    expect(progressSnapshot(v())).toBeNull();
    expect(() => restoreProgress(v())).toThrow();
  });

  it('a node whose parent stays dark is not raised (LR-39a)', async () => {
    const { v, ids } = await progressed();
    resetProgress(v(), new Date().toISOString());
    const snapshot = progressSnapshot(v())!; delete snapshot.nodes[ids.a];
    restoreProgress(v());
    expect(v().nodes[ids.a].state).toBe('open'); expect(v().nodes[ids.a1].state).toBe('open');
  });

  it('refuses when nothing is lit, and validation rejects a broken snapshot', () => {
    const { v } = course();
    const fresh: RoomVisit = newLearnSubject('Empty').rooms.learn;
    expect(() => resetProgress(fresh, 'x')).toThrow('Nothing');
    v().data = { ...v().data, progressSnapshot: { at: 'x', nodes: { n: { state: 'understood' } } } };
    expect(() => validateLearn(v())).toThrow('saved progress');
  });
});
