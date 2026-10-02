import { childrenOf, nodeOf, pathTo } from '../../core/graph';
import type { GraphNode, RoomVisit } from '../../core/model';
import { clip } from './protocol';
import type { Task } from './protocol';
const mark = (n: GraphNode) => n.state === 'understood' ? `understood:${n.understoodBy}` : n.state;
const singleLine = (text: string) => text.replace(/\s*\n\s*/g, ' ').trimEnd();
const title = (n: GraphNode) => clip(singleLine(n.title), 80);
const hook = (n: GraphNode) => n.hook ? ` — ${clip(singleLine(n.hook), 120)}` : '';
const tokens = (text: string) => Math.ceil(text.length / 3);
const byCreated = (a: GraphNode, b: GraphNode) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
export function pendingCheck(v: RoomVisit, id: string): boolean {
  const n = nodeOf(v, id), turns = n.dialogue;
  if (!['lit', 'understood'].includes(n.state) || turns.at(-1)?.role !== 'learner') return false;
  const previous = turns.at(-2);
  if (!previous || previous.role !== 'tutor' || previous.author.kind !== 'model') return false;
  const generationId = previous.author.generationId;
  return v.log.some(g => g.id === generationId && g.task === 'check' && g.outcome === 'ok');
}
function explanation(n: GraphNode, heading: string, limit: number) {
  return n.content ? `${heading}${n.edited ? ' (corrected by the learner)' : ''}\n${clip(n.content, n.edited ? limit * 3 : limit)}` : '';
}
export function buildContext(v: RoomVisit, task: Task, focusId: string, { budgetTokens = 12_000, existingSubjects = [] }: { budgetTokens?: number; existingSubjects?: string[] } = {}) {
  if (!Number.isFinite(budgetTokens) || budgetTokens < 0) throw new Error('Invalid map budget');
  const blocks: Record<string, string> = {};
  const stats = { form: 'full' as 'full' | 'reduced', mapTokens: 0, nodes: Object.keys(v.nodes).length, omittedTurns: 0, overBudget: false };
  if (task === 'suggest') { blocks.EXISTING_SUBJECTS = existingSubjects.slice(0, 30).map(singleLine).join('; ') || 'none'; return { blocks, stats }; }
  blocks.SUBJECT_BLOCK = `SUBJECT: ${singleLine(nodeOf(v, v.rootId).title)}`;
  if (task === 'intro') return { blocks, stats };
  const focus = nodeOf(v, focusId), path = pathTo(v, focusId);
  blocks.PATH_BLOCK = `PATH TO CURRENT NODE: ${path.map(n => `${title(n)} (${n.id})`).join(' > ')}`;
  const children = new Map<string, GraphNode[]>();
  for (const n of Object.values(v.nodes)) if (n.parents[0]) children.set(n.parents[0], [...(children.get(n.parents[0]) ?? []), n]);
  for (const siblings of children.values()) siblings.sort(byCreated);
  const tree: { n: GraphNode; depth: number }[] = [];
  const stack = [{ n: nodeOf(v, v.rootId), depth: 0 }], seen = new Set<string>();
  while (stack.length) {
    const item = stack.pop()!; if (seen.has(item.n.id)) throw new Error('Cycle in graph');
    seen.add(item.n.id); tree.push(item);
    stack.push(...[...(children.get(item.n.id) ?? [])].reverse().map(n => ({ n, depth: item.depth + 1 })));
  }
  const line = (n: GraphNode, withHook: boolean) => `- ${n.id} [${mark(n)}] ${title(n)}${withHook ? hook(n) : ''}${n.id === focusId ? '   <== current node' : ''}`;
  const full = [`MAP (${stats.nodes} nodes. Marks: open, lit, understood:demonstrated, understood:self, dismissed)`, ...tree.map(({ n, depth }) => '  '.repeat(depth) + line(n, true))].join('\n');
  const mapSize = (map: string) => tokens([blocks.SUBJECT_BLOCK, map, blocks.PATH_BLOCK].join('\n\n'));
  if (mapSize(full) <= budgetTokens) blocks.MAP_BLOCK = full;
  else {
    stats.form = 'reduced';
    const pathIds = new Set(path.map(n => n.id));
    const neighbours = [...(focus.parents[0] ? children.get(focus.parents[0]) ?? [] : []), ...(children.get(focusId) ?? [])].filter(n => !pathIds.has(n.id));
    const fixed = new Set([...pathIds, ...neighbours.map(n => n.id)]);
    const focusPath = path.map(n => n.id);
    const distance = (n: GraphNode) => {
      const other = pathTo(v, n.id).map(n => n.id); let shared = 0;
      while (shared < other.length && shared < focusPath.length && other[shared] === focusPath[shared]) shared++;
      return other.length + focusPath.length - shared * 2;
    };
    const descendants = new Map<string, number>();
    const queue = (children.get(focusId) ?? []).map(n => ({ n, depth: 1 }));
    for (let i = 0; i < queue.length; i++) {
      const { n, depth } = queue[i]; descendants.set(n.id, depth);
      queue.push(...(children.get(n.id) ?? []).map(n => ({ n, depth: depth + 1 })));
    }
    const others = tree.map(t => t.n).filter(n => !fixed.has(n.id)).sort((a, b) => {
      const ad = descendants.get(a.id), bd = descendants.get(b.id);
      if (ad !== undefined || bd !== undefined) { if (ad === undefined) return 1; if (bd === undefined) return -1; return ad - bd || byCreated(a, b); }
      return distance(a) - distance(b) || byCreated(a, b);
    });
    const optionalHooks = new Set<string>();
    const render = () => [`MAP (reduced: ${stats.nodes} nodes. Path, then neighbourhood, then every other title. Marks as above)`, 'PATH',
      ...path.map(n => line(n, true)), 'NEIGHBOURHOOD (siblings and children of the current node)',
      ...neighbours.map(n => `${line(n, true)}   (${n.parents[0] === focusId ? 'child' : 'sibling'})`), 'OTHER NODES (id [mark] title, parent id)',
      ...others.map(n => `${line(n, false)} (parent ${n.parents[0]})${optionalHooks.has(n.id) ? hook(n) : ''}`)].join('\n');
    for (const n of others) {
      if (!n.hook) continue;
      optionalHooks.add(n.id); if (mapSize(render()) > budgetTokens) { optionalHooks.delete(n.id); break; }
    }
    blocks.MAP_BLOCK = render();
  }
  stats.mapTokens = mapSize(blocks.MAP_BLOCK); stats.overBudget = stats.mapTokens > budgetTokens;
  if (['light', 'reply', 'check'].includes(task)) {
    const parent = path.at(-2);
    let parentBlock = parent ? explanation(parent, `WHAT THE PARENT NODE ("${title(parent)}") SAID (for continuity):`, 2500) : '';
    const ancestors = path.slice(0, -2).reverse().filter(n => n.edited && n.content).slice(0, 3);
    if (ancestors.length) parentBlock += `${parentBlock ? '\n\n' : ''}LEARNER CORRECTIONS ON EARLIER NODES OF THE PATH:\n${ancestors.map(n => explanation(n, `"${title(n)}":`, 2500)).join('\n\n')}`;
    if (parentBlock) blocks.PARENT_BLOCK = parentBlock;
  }
  if (['more', 'reply', 'check'].includes(task)) {
    const focusBlock = explanation(focus, 'WHAT YOU EXPLAINED ON THIS NODE:', 6000);
    if (focusBlock) blocks.FOCUS_BLOCK = focusBlock;
  }
  if (['reply', 'check'].includes(task) && focus.dialogue.length) {
    stats.omittedTurns = Math.max(0, focus.dialogue.length - 12);
    blocks.DIALOGUE_BLOCK = [stats.omittedTurns ? `(${stats.omittedTurns} earlier turn${stats.omittedTurns === 1 ? '' : 's'} omitted)` : '', 'DIALOGUE ON THIS NODE:',
      ...focus.dialogue.slice(-12).map(t => `${t.role === 'learner' ? 'LEARNER' : `TUTOR${t.edited ? ' (corrected by the learner)' : ''}`}: ${t.text}`)].filter(Boolean).join('\n');
  }
  if (task === 'reply') blocks.PENDING_CHECK = pendingCheck(v, focusId) ? 'yes' : 'no';
  if (task === 'more') blocks.EXISTING_CHILDREN = childrenOf(v, focusId).map(n => `${n.id} "${title(n)}" [${mark(n)}]`).join('; ') || 'none';
  return { blocks, stats };
}
