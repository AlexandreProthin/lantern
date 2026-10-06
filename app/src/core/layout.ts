import { childrenOf, nodeOf } from './graph';
import type { GraphNode, RoomVisit } from './model';
export interface Point { x: number; y: number }
/** GV-10: reusable tree layout for live graph and thumbnails; safe at deep nesting. */
export function treePositions(v: { rootId: string; nodes: Record<string, Pick<GraphNode, 'id' | 'parents' | 'createdAt'>> }, column = 240, row = 96): Map<string, Point> {
  const positions = new Map<string, Point>(), stack = [{ id: v.rootId, depth: 0, visited: false }];
  const children = new Map<string, string[]>();
  for (const n of Object.values(v.nodes)) children.set(n.id, []);
  for (const n of Object.values(v.nodes)) if (n.parents[0]) children.get(n.parents[0])?.push(n.id);
  for (const ids of children.values()) ids.sort((a,b)=>v.nodes[a].createdAt.localeCompare(v.nodes[b].createdAt)||a.localeCompare(b));
  let cursor = 0, maxDepth = 0;
  const seen = new Set<string>();
  while (stack.length) {
    const item = stack.pop()!, kids = children.get(item.id) ?? [];
    if (!item.visited) {
      if (seen.has(item.id)) throw new Error('Cycle in graph'); seen.add(item.id);
      if (!Object.hasOwn(v.nodes, item.id)) throw new Error('Missing tree node');
      stack.push({ ...item, visited: true }, ...[...kids].reverse().map(id => ({ id, depth: item.depth + 1, visited: false })));
    } else {
      maxDepth = Math.max(maxDepth, item.depth);
      positions.set(item.id, { x: item.depth, y: kids.length ? kids.reduce((sum, id) => sum + positions.get(id)!.y, 0) / kids.length : cursor++ });
    }
  }
  for (const p of positions.values()) { p.x = (p.x - maxDepth / 2) * column; p.y = (p.y - (cursor - 1) / 2) * row; }
  return positions;
}
/** GV-14: stable initial positions around the parent; no random source. */
export function initialPosition(id: string, parent: Point = { x: 0, y: 0 }): Point {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i++) hash = Math.imul(hash ^ id.charCodeAt(i), 16777619);
  const angle = (hash >>> 0) / 4294967296 * Math.PI * 2;
  return { x: parent.x + Math.cos(angle) * 30, y: parent.y + Math.sin(angle) * 30 };
}
/** GV-70: shared navigation for both layouts. */
export function keyboardTarget(v: RoomVisit, id: string, key: string): string {
  const n = nodeOf(v, id), siblings = n.parents[0] ? childrenOf(v, n.parents[0]) : [];
  const index = siblings.findIndex(n => n.id === id);
  if (key === 'Home') return v.rootId;
  if (key === 'ArrowLeft') return n.parents[0] ?? id;
  if (key === 'ArrowRight') return childrenOf(v, id)[0]?.id ?? id;
  if (key === 'ArrowUp') return siblings[index - 1]?.id ?? id;
  if (key === 'ArrowDown') return siblings[index + 1]?.id ?? id;
  return id;
}
