// GV-145..149: the graph's filters. They work on the drawn nodes (visibility and collapse, core/visibility.ts, come
// first) and only hide: the simulation keeps every drawn node where it is, so a filter change never moves the map.
import type { GraphNode, RoomVisit } from '../../core/model';

export interface GraphFilters {
  /** One module only: a child of the root; the root and that module's subtree stay. */
  module: string | null;
  /** Hide the nodes the room counts as understood (Learn: understood; Choose: settled). */
  hideUnderstood: boolean;
  /** The focus, its parent, its children and its text-link neighbours only. */
  neighbours: boolean;
}
export const noFilters = (): GraphFilters => ({ module: null, hideUnderstood: false, neighbours: false });
export const filtering = (f: GraphFilters) => f.module !== null || f.hideUnderstood || f.neighbours;

export interface FilterContext {
  /** The ids the graph draws (shown, with no collapsed ancestor). */
  drawn: Set<string>;
  understood: (node: GraphNode) => boolean;
  /** Text links between nodes (GV-40), for the neighbours filter. */
  links: { from: string; to: string }[];
}

/** The module (child of the root) a node belongs to, or null for the root itself. */
export function moduleOf(visit: RoomVisit, id: string): string | null {
  let cur: string | undefined = id;
  const seen = new Set<string>();
  while (cur && !seen.has(cur)) {
    seen.add(cur);
    const parent: string | undefined = visit.nodes[cur]?.parents[0] ?? undefined;
    if (parent === visit.rootId) return cur;
    cur = parent;
  }
  return null;
}

/**
 * The drawn nodes that pass every active filter, or null when none is active (everything drawn is visible).
 * The root and the focus always stay (GV-122), and so does the way from a visible node to the root, so the tree
 * never shows a node cut from its parent (except under *focus plus neighbours*, which is that one neighbourhood).
 */
export function visibleIds(visit: RoomVisit, filters: GraphFilters, ctx: FilterContext): Set<string> | null {
  if (!filtering(filters)) return null;
  const { drawn } = ctx, focus = visit.focusId;
  let keep = new Set(drawn);
  if (filters.module && drawn.has(filters.module)) keep = new Set([...keep].filter(id => id === visit.rootId || moduleOf(visit, id) === filters.module));
  if (filters.neighbours) {
    const near = new Set<string>([focus]);
    const parent = visit.nodes[focus]?.parents[0];
    if (parent) near.add(parent);
    for (const node of Object.values(visit.nodes)) if (node.parents[0] === focus) near.add(node.id);
    for (const link of ctx.links) { if (link.from === focus) near.add(link.to); if (link.to === focus) near.add(link.from); }
    keep = new Set([...keep].filter(id => near.has(id)));
  }
  if (filters.hideUnderstood) keep = new Set([...keep].filter(id => !visit.nodes[id] || !ctx.understood(visit.nodes[id])));
  if (drawn.has(focus)) keep.add(focus);
  if (!filters.neighbours) {
    keep.add(visit.rootId);
    // The way up from every visible node stays, so a hidden understood parent does not orphan an open child.
    for (const id of [...keep]) {
      let cur = visit.nodes[id]?.parents[0];
      while (cur && drawn.has(cur) && !keep.has(cur)) { keep.add(cur); cur = visit.nodes[cur]?.parents[0]; }
    }
  }
  return keep;
}

/** The root's children that are drawn, in visit order: the choices of *one module only*. */
export function modulesOf(visit: RoomVisit, drawn: Set<string>): GraphNode[] {
  return Object.values(visit.nodes).filter(n => n.parents[0] === visit.rootId && drawn.has(n.id));
}

/** GV-149: filters last for the app session, per subject; nothing is stored. */
const kept = new Map<string, GraphFilters>();
export const filterMemory = {
  get: (subjectId: string): GraphFilters => ({ ...(kept.get(subjectId) ?? noFilters()) }),
  set: (subjectId: string, filters: GraphFilters) => { if (filtering(filters)) kept.set(subjectId, { ...filters }); else kept.delete(subjectId); },
};
