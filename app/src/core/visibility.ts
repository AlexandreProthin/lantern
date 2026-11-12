import type { GraphNode, RoomVisit } from './model';

/** GV-120: the room's rule for "this node shows its children" (Learn: lit or understood). */
export type Opens = (node: GraphNode) => boolean;

/** Children ids per parent id, in creation order (GV-13). One pass, for the functions below. */
export function childMap(v: RoomVisit): Map<string, string[]> {
  const children = new Map<string, GraphNode[]>();
  for (const n of Object.values(v.nodes)) if (n.parents[0]) {
    const list = children.get(n.parents[0]); if (list) list.push(n); else children.set(n.parents[0], [n]);
  }
  return new Map([...children].map(([id, list]) => [id, list.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).map(n => n.id)]));
}

/** GV-120: a node is shown when its parent is shown and opens its children; the root always is. No rule shows everything. */
export function shownIds(v: RoomVisit, opens?: Opens, children = childMap(v)): Set<string> {
  if (!opens) return new Set(Object.keys(v.nodes));
  const shown = new Set<string>(), queue = Object.hasOwn(v.nodes, v.rootId) ? [v.rootId] : [];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]; shown.add(id);
    if (opens(v.nodes[id])) for (const child of children.get(id) ?? []) if (!shown.has(child)) queue.push(child);
  }
  return shown;
}

/** GV-131: shown nodes with no collapsed ancestor. */
export function drawnIds(v: RoomVisit, shown: Set<string>, collapsed: ReadonlySet<string>, children = childMap(v)): Set<string> {
  const drawn = new Set<string>(), queue = shown.has(v.rootId) ? [v.rootId] : [];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i]; drawn.add(id);
    if (!collapsed.has(id)) for (const child of children.get(id) ?? []) if (shown.has(child) && !drawn.has(child)) queue.push(child);
  }
  return drawn;
}

/** GV-133: for each collapsed drawn node, how many shown descendants it hides. */
export function hiddenCounts(v: RoomVisit, shown: Set<string>, drawn: Set<string>, collapsed: ReadonlySet<string>, children = childMap(v)): Map<string, number> {
  const counts = new Map<string, number>();
  for (const id of collapsed) {
    if (!drawn.has(id)) continue;
    let count = 0; const stack = [...children.get(id) ?? []];
    while (stack.length) { const next = stack.pop()!; if (!shown.has(next)) continue; count++; stack.push(...children.get(next) ?? []); }
    if (count) counts.set(id, count);
  }
  return counts;
}

/** GV-122: the node itself when shown, else its nearest shown ancestor (the root at worst). */
export function nearestShown(v: RoomVisit, shown: Set<string>, id: string): string {
  const seen = new Set<string>();
  while (Object.hasOwn(v.nodes, id) && !shown.has(id) && !seen.has(id)) { seen.add(id); id = v.nodes[id].parents[0] ?? v.rootId; }
  return shown.has(id) ? id : v.rootId;
}

/** GV-134: the collapsed ancestors that hide a node (to expand when it is focused). */
export function collapsedAncestors(v: RoomVisit, collapsed: ReadonlySet<string>, id: string): string[] {
  const found: string[] = [], seen = new Set<string>();
  let parent = v.nodes[id]?.parents[0];
  while (parent && Object.hasOwn(v.nodes, parent) && !seen.has(parent)) {
    seen.add(parent); if (collapsed.has(parent)) found.push(parent); parent = v.nodes[parent].parents[0];
  }
  return found;
}
