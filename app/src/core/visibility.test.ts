import { describe, expect, it, vi, afterEach } from 'vitest';
import { addChild } from './graph';
import { createSubject } from './model';
import type { GraphNode, RoomVisit } from './model';
import { childMap, collapsedAncestors, drawnIds, hiddenCounts, nearestShown, shownIds } from './visibility';
import { replayText, REPLAY_STREAM_MS } from './replay';

const opens = (n: GraphNode) => n.state === 'lit' || n.state === 'understood';
/** root(lit) > a(lit) > a1(open, prepared) > a1x(open); root > b(open) > b1(open); root > c(dismissed) > c1(open). */
function course(): { v: RoomVisit; ids: Record<string, string> } {
  const v = createSubject('Course', 'learn', { model: 'opus', effort: 'medium', data: {}, root: { kind: 'subject', state: 'lit' } }).rooms.learn;
  const add = (parent: string, title: string, state: string) => addChild(v, parent, { title, kind: 'axis', state, createdBy: 'model' }).id;
  const ids: Record<string, string> = { root: v.rootId };
  ids.a = add(v.rootId, 'A', 'lit'); ids.a1 = add(ids.a, 'A1', 'open'); ids.a1x = add(ids.a1, 'A1x', 'open');
  ids.b = add(v.rootId, 'B', 'open'); ids.b1 = add(ids.b, 'B1', 'open');
  ids.c = add(v.rootId, 'C', 'dismissed'); ids.c1 = add(ids.c, 'C1', 'open');
  return { v, ids };
}

describe('visibility (GV-120..134)', () => {
  it('shows a node when its parent is shown and opens; the root always', () => {
    const { v, ids } = course(), shown = shownIds(v, opens);
    expect([...shown].sort()).toEqual([ids.root, ids.a, ids.a1, ids.b, ids.c].sort());
    v.nodes[v.rootId].state = 'open';
    expect([...shownIds(v, opens)]).toEqual([ids.root]);
    expect(shownIds(v).size).toBe(8); // no rule: everything
  });

  it('a lit node under a dark parent stays hidden (a hand-made file that breaks LR-39a)', () => {
    const { v, ids } = course(); v.nodes[ids.b1].state = 'lit';
    expect(shownIds(v, opens).has(ids.b1)).toBe(false);
  });

  it('collapse hides descendants, counts only shown ones, and the focus falls back to a shown ancestor', () => {
    const { v, ids } = course(), children = childMap(v), shown = shownIds(v, opens, children);
    const drawn = drawnIds(v, shown, new Set([ids.a]), children);
    expect(drawn.has(ids.a)).toBe(true); expect(drawn.has(ids.a1)).toBe(false);
    expect(hiddenCounts(v, shown, drawn, new Set([ids.a]), children).get(ids.a)).toBe(1); // a1x is not shown, so not counted
    const all = drawnIds(v, shown, new Set([v.rootId]), children);
    expect([...all]).toEqual([v.rootId]);
    expect(hiddenCounts(v, shown, all, new Set([v.rootId, ids.a]), children)).toEqual(new Map([[v.rootId, 4]]));
    expect(nearestShown(v, shown, ids.a1x)).toBe(ids.a1);
    expect(nearestShown(v, shown, ids.c1)).toBe(ids.c);
    expect(nearestShown(v, shown, 'gone')).toBe(v.rootId);
    expect(collapsedAncestors(v, new Set([v.rootId, ids.a, ids.b]), ids.a1x)).toEqual([ids.a, v.rootId]);
  });

  it('handles 200 nodes in one linear pass', () => {
    const { v } = course();
    let parent = v.rootId;
    for (let i = 0; i < 200; i++) { const id = addChild(v, parent, { title: `n${i}`, kind: 'axis', state: i % 3 ? 'lit' : 'open', createdBy: 'model' }).id; if (i % 3) parent = id; }
    const started = performance.now(); const shown = shownIds(v, opens); drawnIds(v, shown, new Set());
    expect(performance.now() - started).toBeLessThan(50);
  });
});

describe('replay streamer (LR-91, LR-93)', () => {
  afterEach(() => vi.useRealTimers());
  it('streams a growing prefix in about REPLAY_STREAM_MS, then the whole text', async () => {
    vi.useFakeTimers();
    const seen: string[] = [], text = 'x'.repeat(3000), replay = replayText(text, t => seen.push(t));
    await vi.advanceTimersByTimeAsync(REPLAY_STREAM_MS / 2);
    expect(seen.at(-1)!.length).toBeGreaterThan(1000); expect(seen.at(-1)!.length).toBeLessThan(2000);
    await vi.advanceTimersByTimeAsync(REPLAY_STREAM_MS);
    expect(await replay.finished).toBe('done'); expect(seen.at(-1)).toBe(text);
    expect(seen.every((t, i) => i === 0 || t.length >= seen[i - 1].length)).toBe(true);
  });
  it('skips to the end, shows everything at once under reduced motion, and stops on abort', async () => {
    vi.useFakeTimers();
    let last = ''; const skipped = replayText('hello world', t => last = t);
    skipped.skip(); expect(await skipped.finished).toBe('skipped'); expect(last).toBe('hello world');
    const shown: string[] = []; const reduced = replayText('all at once', t => shown.push(t), { reduced: true });
    expect(await reduced.finished).toBe('done'); expect(shown).toEqual(['all at once']);
    const controller = new AbortController(), aborted = replayText('never whole', t => last = t, { signal: controller.signal });
    controller.abort(); expect(await aborted.finished).toBe('cancelled'); expect(last).not.toBe('never whole');
  });
  it('never splits a surrogate pair', async () => {
    vi.useFakeTimers();
    const seen: string[] = [], replay = replayText('😀'.repeat(50), t => seen.push(t));
    await vi.advanceTimersByTimeAsync(REPLAY_STREAM_MS * 2); await replay.finished;
    expect(seen.every(t => !/[\uD800-\uDBFF]$/.test(t))).toBe(true);
  });
});
