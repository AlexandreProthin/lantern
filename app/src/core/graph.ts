import { checkedTitle, newId, normalizeTitle, now } from './model';
import type { Author, GraphNode, NodeKind, NodeState, RoomVisit, Turn } from './model';

export function nodeOf(v: RoomVisit, id: string): GraphNode {
  if (!Object.hasOwn(v.nodes, id)) throw new Error('Node does not exist');
  return v.nodes[id];
}
export const childrenOf = (v: RoomVisit, id: string) => Object.values(v.nodes).filter(n => n.parents[0] === id)
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
export function pathTo(v: RoomVisit, id: string): GraphNode[] {
  const path: GraphNode[] = [], seen = new Set<string>();
  while (id) {
    if (seen.has(id)) throw new Error('Cycle in graph');
    seen.add(id); const n = nodeOf(v, id); path.unshift(n); id = n.parents[0];
  }
  return path;
}
export function addChild(v: RoomVisit, parentId: string, input: { title: string; hook?: string; kind: NodeKind; createdBy: 'tutor' | 'learner'; author?: Author }): GraphNode {
  const parent = nodeOf(v, parentId), title = checkedTitle(input.title);
  if (!['lit', 'understood'].includes(parent.state)) throw new Error('Parent must be lit');
  if ((input.hook ?? '').length > 200) throw new Error('Hook is too long');
  const candidates = input.createdBy === 'learner' ? childrenOf(v, parentId) : Object.values(v.nodes);
  if (candidates.some(n => normalizeTitle(n.title) === normalizeTitle(title))) throw new Error('Duplicate title');
  let id = newId(); while (Object.hasOwn(v.nodes, id)) id = newId();
  const node: GraphNode = { id, parents: [parentId], title, hook: input.hook?.trim() ?? '', kind: input.kind,
    state: 'open', understoodBy: null, content: '', author: input.author, dialogue: [], createdAt: now(), createdBy: input.createdBy };
  v.nodes[id] = node; return node;
}
export function setState(v: RoomVisit, id: string, state: NodeState, understoodBy: GraphNode['understoodBy'] = null): void {
  const n = nodeOf(v, id);
  const valid = (n.state === 'open' && ['lit', 'dismissed'].includes(state)) || (n.state === 'dismissed' && state === 'open')
    || (n.state === 'lit' && state === 'understood') || (n.state === 'understood' && state === 'lit')
    || (n.state === 'understood' && state === 'understood' && understoodBy === 'demonstrated');
  if (!valid || ((state === 'understood') !== (understoodBy === 'self' || understoodBy === 'demonstrated'))) throw new Error('Invalid state transition');
  n.state = state; n.understoodBy = understoodBy;
}
export function subtreeIds(v: RoomVisit, id: string): string[] {
  nodeOf(v, id);
  const children = new Map<string, string[]>();
  for (const n of Object.values(v.nodes)) if (n.parents[0]) children.set(n.parents[0], [...(children.get(n.parents[0]) ?? []), n.id]);
  const result = [id], seen = new Set(result);
  for (let i = 0; i < result.length; i++) for (const child of children.get(result[i]) ?? []) {
    if (seen.has(child)) throw new Error('Cycle in graph'); seen.add(child); result.push(child);
  }
  return result;
}
export function deleteSubtree(v: RoomVisit, id: string): number {
  if (id === v.rootId) throw new Error('Root cannot be deleted');
  const parent = nodeOf(v, id).parents[0], ids = subtreeIds(v, id);
  if (ids.includes(v.focusId)) v.focusId = parent;
  for (const removed of ids) delete v.nodes[removed];
  return ids.length;
}
export function editLabel(n: GraphNode, field: 'title' | 'hook', text: string, by: string, at = now()): void {
  if (field === 'title') text = checkedTitle(text);
  else if ([...text].length > 200) throw new Error('Hook is too long');
  n[field] = text; n.edited = { by, at };
}
export function editText(target: GraphNode | Turn, text: string, by: string, at = now()): void {
  if (!text.trim()) throw new Error('Text is empty');
  if ('role' in target && target.role !== 'tutor') throw new Error('Learner turns are not editable');
  if ('state' in target && !['lit', 'understood'].includes(target.state)) throw new Error('Node must be lit');
  const field = 'role' in target ? 'text' : 'content';
  if (target.author?.kind === 'model' && target.previous === undefined) target.previous = target[field as keyof typeof target] as string;
  if ('role' in target) target.text = text; else target.content = text;
  target.edited = { by, at }; // Keep the model author; edited identifies the learner's correction.
}
export function revertText(target: GraphNode | Turn): void {
  if (target.previous === undefined) throw new Error('No original text');
  if ('role' in target) target.text = target.previous; else target.content = target.previous;
  delete target.previous; delete target.edited;
}
