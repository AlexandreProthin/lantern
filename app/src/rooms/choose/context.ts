import { childrenOf, nodeOf, pathTo } from '../../core/graph';
import type { GraphNode, RoomVisit } from '../../core/model';
import { clip } from '../learn/protocol';
import { answerOf, cells, chooseData, facts, nodesOfKind, rejectedOf } from './rules';
import type { Cell, Task } from './rules';

const singleLine = (text: string) => text.replace(/\s*\n\s*/g, ' ').trimEnd();
const title = (n: GraphNode) => clip(singleLine(n.title), 80);
const hook = (n: GraphNode) => n.hook ? ` — ${clip(singleLine(n.hook), 120)}` : '';
const tokens = (text: string) => Math.ceil(text.length / 3);
/** At most `max` characters, ellipsis included. */
const cut = (text: string, max: number) => text.length > max ? text.slice(0, max - 1) + '…' : text;
const byCreated = (a: GraphNode, b: GraphNode) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
const mark = (n: GraphNode) => `${n.kind}:${n.state}`;
const live = (v: RoomVisit, kind: Parameters<typeof nodesOfKind>[1]) => nodesOfKind(v, kind).filter(n => n.state !== 'dismissed').sort(byCreated);
const shortlist = (v: RoomVisit) => nodesOfKind(v, 'product').filter(n => n.state === 'shortlisted' || n.state === 'chosen').sort(byCreated);
const ranked = (v: RoomVisit) => nodesOfKind(v, 'criterion').filter(n => n.state === 'must' || n.state === 'nice').sort(byCreated);
const lines = (text: string) => text.trim().split(/\r?\n/).map(line => line.trimEnd()).join('\n');

function explanation(n: GraphNode, heading: string, limit: number) {
  return n.content ? `${heading}${n.edited ? ' (corrected by the user)' : ''}\n${clip(n.content, n.edited ? limit * 3 : limit)}` : '';
}
/** CP-50: the needs card, in every call (CR-31). */
function needsBlock(v: RoomVisit): string {
  const note = lines(chooseData(v).needsNote ?? ''), needs = live(v, 'need');
  const answered = needs.filter(n => n.state === 'answered'), open = needs.filter(n => n.state !== 'answered');
  if (!note && !needs.length) return 'NEEDS: none yet';
  return [note ? `IN THE USER'S WORDS:\n${note}` : '', answered.length ? ['ANSWERED NEEDS:', ...answered.map(n => `- ${n.id} ${singleLine(n.title)}: ${singleLine(answerOf(n)?.text ?? '')}`)].join('\n') : '',
    open.length ? ['STILL OPEN:', ...open.map(n => `- ${n.id} ${singleLine(n.title)}`)].join('\n') : ''].filter(Boolean).join('\n');
}
/** CP-50: criteria by rank, shortlist, rejected, status. */
function boardBlock(v: RoomVisit): string {
  const criteria = live(v, 'criterion'), group = (head: string, items: string[]) => items.length ? [head, ...items] : [];
  const rank = (state: string) => criteria.filter(n => n.state === state).map(n => `- ${n.id} ${title(n)}${hook(n)}`);
  const rejected = nodesOfKind(v, 'product').filter(n => n.state === 'rejected').sort(byCreated);
  return ['BOARD (the user\'s work so far; ids as in the MAP)', ...group('MUST:', rank('must')), ...group('NICE:', rank('nice')), ...group('TO RANK:', rank('open')), ...group('IRRELEVANT:', rank('irrelevant')),
    ...group('SHORTLIST:', shortlist(v).map(n => `- ${n.id} ${title(n)}${n.state === 'chosen' ? ' [chosen]' : ''}`)),
    ...group('REJECTED:', rejected.map(n => `- ${n.id} ${title(n)} — ${singleLine(rejectedOf(n)?.reason ?? '')}`)), `STATUS: ${chooseData(v).status}`].join('\n');
}
const sourceTag = (c: Cell) => c.sources.length ? ` [${[...new Set(c.sources.map(s => s.kind))].join('+')}, ${c.sources.map(s => s.read).sort()[0]}]` : '';
/** CP-50: one line per stored cell of the shortlist × must and nice criteria. */
function compareBlock(v: RoomVisit): string {
  const criteria = ranked(v), out: string[] = [];
  for (const p of shortlist(v)) for (const c of criteria) {
    const cell = cells(p)[c.id]; if (!cell) continue;
    const room = cell.value === null ? 'nothing found' : `${cell.disagree ? '≠ ' : ''}${singleLine(cell.value)}`;
    out.push(cut(`${p.id} × ${c.id}: ${cell.user ? `${singleLine(cell.user.value)} (the user's value); the room's value: ${room}` : room}${sourceTag(cell)}`, 300));
  }
  return out.length ? ['COMPARE (product × criterion: value [source kinds, oldest read date]):', ...out].join('\n') : '';
}
export interface Slot { productId: string; criterionId: string }
/** CP-40: the empty cells of the focus product's column or the focus criterion's row; on the subject, every empty cell. */
export function fillTarget(v: RoomVisit, focusId: string): Slot[] {
  const focus = nodeOf(v, focusId), products = shortlist(v).filter(p => focus.kind !== 'product' || p.id === focusId), criteria = ranked(v).filter(c => focus.kind !== 'criterion' || c.id === focusId);
  return products.flatMap(p => criteria.filter(c => !cells(p)[c.id]).map(c => ({ productId: p.id, criterionId: c.id })));
}
const factLine = (f: { label: string; value: string; sources: { kind: string; read: string }[] }) =>
  `- ${singleLine(f.label)}: ${singleLine(f.value)}${f.sources.length ? ` [${[...new Set(f.sources.map(s => s.kind))].join('+')}, ${f.sources.map(s => s.read).sort()[0]}]` : ''}`;

export interface ContextOptions { budgetTokens?: number; today: string; target?: Slot[]; turn?: number }
/** CP-50..CP-53, CA-1: pure; `today` is an argument, never the clock. `target` overrides CP-40's default for `fill`; `turn` is the index in the focus dialogue of the turn a `check` looks at. */
export function buildContext(v: RoomVisit, task: Task, focusId: string, { budgetTokens = 12_000, today, target, turn }: ContextOptions) {
  if (!Number.isFinite(budgetTokens) || budgetTokens < 0) throw new Error('Invalid map budget');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) throw new Error('Invalid date');
  const b: Record<string, string> = {};
  const stats = { form: 'full' as 'full' | 'reduced', mapTokens: 0, nodes: Object.keys(v.nodes).length, omittedTurns: 0, overBudget: false };
  const focus = nodeOf(v, focusId), path = pathTo(v, focusId), { locale } = chooseData(v);
  b.SUBJECT_BLOCK = `SUBJECT: ${singleLine(nodeOf(v, v.rootId).title)}`;
  b.LOCALE_BLOCK = `USER'S COUNTRY: ${locale.country} · CURRENCY: ${locale.currency} · TODAY: ${today}`;
  b.NEEDS_BLOCK = needsBlock(v);
  if (task === 'intro') return { blocks: b, stats };
  b.BOARD_BLOCK = boardBlock(v);
  if (task === 'fill') {
    const compare = compareBlock(v); if (compare) b.COMPARE_BLOCK = compare;
    b.TARGET = ['TARGET (the cells to fill, exactly these):', ...(target ?? fillTarget(v, focusId)).map(t => `${t.productId} × ${t.criterionId} (${singleLine(nodeOf(v, t.criterionId).title)})`)].join('\n');
    return { blocks: b, stats };
  }
  b.PATH_BLOCK = `PATH TO CURRENT NODE: ${path.map(n => `${title(n)} (${n.id})`).join(' > ')}`;
  const children = new Map<string, GraphNode[]>();
  for (const n of Object.values(v.nodes)) if (n.parents[0]) children.set(n.parents[0], [...(children.get(n.parents[0]) ?? []), n]);
  for (const siblings of children.values()) siblings.sort(byCreated);
  const tree: { n: GraphNode; depth: number }[] = [], stack = [{ n: nodeOf(v, v.rootId), depth: 0 }], seen = new Set<string>();
  while (stack.length) {
    const item = stack.pop()!; if (seen.has(item.n.id)) throw new Error('Cycle in graph');
    seen.add(item.n.id); tree.push(item);
    stack.push(...[...(children.get(item.n.id) ?? [])].reverse().map(n => ({ n, depth: item.depth + 1 })));
  }
  const line = (n: GraphNode, withHook: boolean) => `- ${n.id} [${mark(n)}] ${title(n)}${withHook ? hook(n) : ''}${n.id === focusId ? '   <== current node' : ''}`;
  const marks = 'Line: id [kind:state] title. States: open, lit, answered, must, nice, irrelevant, candidate, shortlisted, chosen, rejected, dismissed';
  const full = [`MAP (${stats.nodes} nodes. ${marks})`, ...tree.map(({ n, depth }) => '  '.repeat(depth) + line(n, true))].join('\n');
  const mapSize = (map: string) => tokens([b.SUBJECT_BLOCK, map, b.PATH_BLOCK].join('\n\n'));
  if (mapSize(full) <= budgetTokens) b.MAP_BLOCK = full;
  else {
    stats.form = 'reduced';
    const pathIds = new Set(path.map(n => n.id)), focusPath = path.map(n => n.id);
    const neighbours = [...(focus.parents[0] ? children.get(focus.parents[0]) ?? [] : []), ...(children.get(focusId) ?? [])].filter(n => !pathIds.has(n.id));
    const fixed = new Set([...pathIds, ...neighbours.map(n => n.id)]);
    const distance = (n: GraphNode) => {
      const other = pathTo(v, n.id).map(p => p.id); let shared = 0;
      while (shared < other.length && shared < focusPath.length && other[shared] === focusPath[shared]) shared++;
      return other.length + focusPath.length - shared * 2;
    };
    const descendants = new Map<string, number>(), queue = (children.get(focusId) ?? []).map(n => ({ n, depth: 1 }));
    for (let i = 0; i < queue.length; i++) {
      const { n, depth } = queue[i]; descendants.set(n.id, depth);
      queue.push(...(children.get(n.id) ?? []).map(c => ({ n: c, depth: depth + 1 })));
    }
    const others = tree.map(t => t.n).filter(n => !fixed.has(n.id)).sort((a, c) => {
      const ad = descendants.get(a.id), cd = descendants.get(c.id);
      if (ad !== undefined || cd !== undefined) { if (ad === undefined) return 1; if (cd === undefined) return -1; return ad - cd || byCreated(a, c); }
      return distance(a) - distance(c) || byCreated(a, c);
    });
    const optionalHooks = new Set<string>();
    const render = () => [`MAP (reduced: ${stats.nodes} nodes. Path, then neighbourhood, then every other title. ${marks})`, 'PATH', ...path.map(n => line(n, true)),
      'NEIGHBOURHOOD (siblings and children of the current node)', ...neighbours.map(n => `${line(n, true)}   (${n.parents[0] === focusId ? 'child' : 'sibling'})`),
      'OTHER NODES (id [kind:state] title, parent id)', ...others.map(n => `${line(n, false)} (parent ${n.parents[0]})${optionalHooks.has(n.id) ? hook(n) : ''}`)].join('\n');
    for (const n of others) {
      if (!n.hook) continue;
      optionalHooks.add(n.id); if (mapSize(render()) > budgetTokens) { optionalHooks.delete(n.id); break; }
    }
    b.MAP_BLOCK = render();
  }
  stats.mapTokens = mapSize(b.MAP_BLOCK); stats.overBudget = stats.mapTokens > budgetTokens;
  if (task === 'recommend') { const compare = compareBlock(v); if (compare) b.COMPARE_BLOCK = compare; return { blocks: b, stats }; }
  if (['light', 'find', 'reply'].includes(task)) {
    const parent = path.at(-2);
    let block = parent ? explanation(parent, `WHAT THE PARENT NODE ("${title(parent)}") SAID (for continuity):`, 2500) : '';
    const ancestors = path.slice(0, -2).reverse().filter(n => n.edited && n.content).slice(0, 3);
    if (ancestors.length) block += `${block ? '\n\n' : ''}USER CORRECTIONS ON EARLIER NODES OF THE PATH:\n${ancestors.map(n => explanation(n, `"${title(n)}":`, 2500)).join('\n\n')}`;
    if (block) b.PARENT_BLOCK = block;
  }
  if (['more', 'reply', 'check'].includes(task) || (task === 'find' && focus.kind !== 'family')) {
    const parts = [explanation(focus, 'WHAT YOU EXPLAINED ON THIS NODE:', 6000), focus.kind === 'product' && facts(focus).length ? ['FACTS OF THIS PRODUCT (label: value [source kinds, oldest read date]):', ...facts(focus).map(factLine)].join('\n') : ''].filter(Boolean);
    if (parts.length) b.FOCUS_BLOCK = parts.join('\n\n');
  }
  if (task === 'reply' && focus.dialogue.length) {
    stats.omittedTurns = Math.max(0, focus.dialogue.length - 12);
    b.DIALOGUE_BLOCK = [stats.omittedTurns ? `(${stats.omittedTurns} earlier turn${stats.omittedTurns === 1 ? '' : 's'} omitted)` : '', 'DIALOGUE ON THIS NODE:',
      ...focus.dialogue.slice(-12).map(t => `${t.role === 'user' ? 'USER' : `ASSISTANT${t.edited ? ' (corrected by the user)' : ''}`}: ${t.text}`)].filter(Boolean).join('\n');
  }
  const checked = task === 'check' && turn !== undefined ? focus.dialogue[turn] : undefined;
  if (checked) b.DIALOGUE_BLOCK = `TURN TO CHECK (${checked.role === 'user' ? 'USER' : 'ASSISTANT'}):\n${checked.text}`;
  if ((task === 'reply' && ['product', 'subject'].includes(focus.kind)) || (task === 'check' && ['product', 'criterion'].includes(focus.kind))) { const compare = compareBlock(v); if (compare) b.COMPARE_BLOCK = compare; }
  if (task === 'more') b.EXISTING_CHILDREN = childrenOf(v, focusId).map(n => `${n.id} "${title(n)}" [${mark(n)}]`).join('; ') || 'none';
  return { blocks: b, stats };
}
