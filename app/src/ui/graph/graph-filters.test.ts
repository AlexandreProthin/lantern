import { describe, expect, it } from 'vitest';
import { addChild } from '../../core/graph';
import { createSubject } from '../../core/model';
import type { GraphNode, RoomVisit } from '../../core/model';
import { filterMemory, filtering, moduleOf, modulesOf, noFilters, visibleIds } from './graph-filters';

const understood = (n: GraphNode) => n.state === 'understood';
/** root > a(understood) > a1(understood), a2(lit) > a2x(open); root > b(lit) > b1(understood); root > c(understood). */
function course(): { v: RoomVisit; ids: Record<string, string> } {
  const v = createSubject('Course', 'learn', { model: 'opus', effort: 'medium', data: {}, root: { kind: 'subject', state: 'lit' } }).rooms.learn;
  const add = (parent: string, title: string, state: string) => addChild(v, parent, { title, kind: 'axis', state, createdBy: 'model' }).id;
  const ids: Record<string, string> = { root: v.rootId };
  ids.a = add(v.rootId, 'A', 'understood'); ids.a1 = add(ids.a, 'A1', 'understood'); ids.a2 = add(ids.a, 'A2', 'lit'); ids.a2x = add(ids.a2, 'A2x', 'open');
  ids.b = add(v.rootId, 'B', 'lit'); ids.b1 = add(ids.b, 'B1', 'understood');
  ids.c = add(v.rootId, 'C', 'understood');
  return { v, ids };
}
const all = (v: RoomVisit) => new Set(Object.keys(v.nodes));
const sorted = (s: Set<string> | null) => s ? [...s].sort() : null;
const pick = (ids: Record<string, string>, ...names: string[]) => names.map(n => ids[n]).sort();

describe('graph filters (GV-145..149)', () => {
  it('no filter: everything drawn is visible', () => {
    const { v } = course();
    expect(visibleIds(v, noFilters(), { drawn: all(v), understood, links: [] })).toBeNull();
    expect(filtering(noFilters())).toBe(false);
  });

  it('one module only keeps the root and that module subtree', () => {
    const { v, ids } = course(); v.focusId = ids.a2;
    expect(moduleOf(v, ids.a2x)).toBe(ids.a); expect(moduleOf(v, v.rootId)).toBeNull();
    expect(modulesOf(v, all(v)).map(n => n.title)).toEqual(['A', 'B', 'C']);
    const shown = visibleIds(v, { ...noFilters(), module: ids.a }, { drawn: all(v), understood, links: [] });
    expect(sorted(shown)).toEqual(pick(ids, 'root', 'a', 'a1', 'a2', 'a2x'));
  });

  it('the focus always stays, even outside the module', () => {
    const { v, ids } = course(); v.focusId = ids.b1;
    const shown = visibleIds(v, { ...noFilters(), module: ids.a }, { drawn: all(v), understood, links: [] })!;
    expect(shown.has(ids.b1)).toBe(true); expect(shown.has(ids.b)).toBe(true); expect(shown.has(ids.c)).toBe(false);
  });

  it('hide understood hides finished branches but keeps the way to what is left', () => {
    const { v, ids } = course(); v.focusId = ids.root;
    const shown = visibleIds(v, { ...noFilters(), hideUnderstood: true }, { drawn: all(v), understood, links: [] });
    // a stays: A2 (lit) and A2x (open) are under it. a1, b1 and c are hidden.
    expect(sorted(shown)).toEqual(pick(ids, 'root', 'a', 'a2', 'a2x', 'b'));
  });

  it('focus plus neighbours: parent, children and text-link neighbours', () => {
    const { v, ids } = course(); v.focusId = ids.a;
    const links = [{ from: ids.b1, to: ids.a }, { from: ids.c, to: ids.b }];
    const shown = visibleIds(v, { ...noFilters(), neighbours: true }, { drawn: all(v), understood, links });
    expect(sorted(shown)).toEqual(pick(ids, 'root', 'a', 'a1', 'a2', 'b1'));
  });

  it('filters compose with visibility and collapse: only drawn nodes can be visible', () => {
    const { v, ids } = course(); v.focusId = ids.a;
    const drawn = new Set([ids.root, ids.a, ids.b, ids.c]); // a folded: its children are not drawn
    expect(sorted(visibleIds(v, { ...noFilters(), neighbours: true }, { drawn, understood, links: [] }))).toEqual(pick(ids, 'root', 'a'));
    expect(sorted(visibleIds(v, { module: ids.b, hideUnderstood: true, neighbours: false }, { drawn, understood, links: [] }))).toEqual(pick(ids, 'root', 'a', 'b'));
  });

  it('are kept per subject for the session, and an empty set is forgotten', () => {
    filterMemory.set('s1', { ...noFilters(), hideUnderstood: true });
    expect(filterMemory.get('s1').hideUnderstood).toBe(true); expect(filterMemory.get('s2')).toEqual(noFilters());
    filterMemory.set('s1', noFilters()); expect(filterMemory.get('s1')).toEqual(noFilters());
  });
});
