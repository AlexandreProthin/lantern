import type { GraphNode, RoomVisit } from '../../core/model';
import { childMap } from '../../core/visibility';

/** GV-57: ignore case, accents and repeated spaces. */
export const foldText = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ');

/** GV-57: ids of the nodes whose title, hook, explanation or dialogue contain the query, in tree order (GV-70).
 * Only `shown` nodes are searched (GV-120); a `sealed` node (Learn: open) matches by title and hook only, so a search never
 * reveals a prepared text before it is lit. */
export function searchNodes(visit: RoomVisit, query: string, { shown, sealed, children }: { shown?: Set<string>; sealed?: (node: GraphNode) => boolean; children?: Map<string, string[]> } = {}): string[] {
  const needle = foldText(query).trim();
  if (!needle) return [];
  // One children map per search (or the caller's): looking children up per node would be quadratic.
  const kids = children ?? childMap(visit);
  const found: string[] = [], seen = new Set<string>(), stack = [visit.rootId];
  while (stack.length) {
    const id = stack.pop()!, node = visit.nodes[id];
    if (!node || seen.has(id) || (shown && !shown.has(id))) continue;
    seen.add(id);
    const text = (sealed?.(node) ? [node.title, node.hook] : [node.title, node.hook, node.content, ...node.dialogue.map(t => t.text)]).join('\n');
    if (foldText(text).includes(needle)) found.push(id);
    const next = kids.get(id); if (next) for (let i = next.length - 1; i >= 0; i--) stack.push(next[i]);
  }
  return found;
}

/** The match after (step 1) or before (step -1) the focused node, wrapping; the first or last when focus is not a match. */
export function stepMatch(matches: string[], focusId: string, step: 1 | -1): string | undefined {
  if (!matches.length) return undefined;
  const at = matches.indexOf(focusId);
  if (at < 0) return step === 1 ? matches[0] : matches[matches.length - 1];
  return matches[(at + step + matches.length) % matches.length];
}
