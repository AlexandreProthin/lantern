// WG-80..86: search across every subject of the library (both rooms): titles, node titles, hooks and the text the
// learner can read. The desktop runs the same rules in Rust (`search_library`, search.rs) over the files; the
// browser build runs this over its localStorage surrogate. Keep the two in step (the tests share their cases).

export interface LibraryHit {
  subjectId: string; subjectTitle: string; room: string; nodeId: string; nodeTitle: string;
  /** Where the words were found first: the node's title, its hook, its text, or the subject's own title. */
  field: 'title' | 'hook' | 'content' | 'subject';
  snippet: string;
}
export interface SearchableNode { title?: string; hook?: string; content?: string; state?: string; parents?: string[] }
export interface SearchableSubject { id: string; title: string; rooms: Record<string, { rootId: string; nodes: Record<string, SearchableNode> }> }

/** At most this many results, and this many per subject (WG-83). */
export const SEARCH_LIMIT = 40, PER_SUBJECT = 5;
/** Characters of context around the first word found. */
const BEFORE = 40, AFTER = 90;

/** Lower case without accents, so *etude* finds *Étude*. One char in, one char out, so offsets hold. */
export function fold(text: string): string {
  return [...text].map(c => { const f = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); return f.length === c.length ? f : c; }).join('');
}
export function words(query: string): string[] { return fold(query).split(/\s+/).filter(Boolean); }

/** GV-120 in Learn: a node is readable when every node above it is lit or understood; other rooms show everything.
 *  GV-57: an open node's text is not searched (its title and hook are). */
function readable(room: string, nodes: Record<string, SearchableNode>, id: string): boolean {
  if (room !== 'learn') return true;
  const seen = new Set<string>();
  let parent = nodes[id]?.parents?.[0];
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const state = nodes[parent]?.state;
    if (state !== 'lit' && state !== 'understood') return false;
    parent = nodes[parent]?.parents?.[0];
  }
  return true;
}

/** A line of context around `at` in `text`, on whitespace, with ellipses where it was cut. */
export function snippet(text: string, at: number, length: number): string {
  const flat = text.replace(/\s+/g, ' ');
  // Offsets move by what the flattening removed before `at`.
  const shift = text.slice(0, at).length - text.slice(0, at).replace(/\s+/g, ' ').length;
  const start = Math.max(0, at - shift - BEFORE), end = Math.min(flat.length, at - shift + length + AFTER);
  return (start > 0 ? '…' : '') + flat.slice(start, end).trim() + (end < flat.length ? '…' : '');
}

export function searchLibrary(subjects: SearchableSubject[], query: string, limit = SEARCH_LIMIT): LibraryHit[] {
  const terms = words(query);
  if (!terms.length) return [];
  const hits: LibraryHit[] = [];
  const sorted = [...subjects].sort((a, b) => a.title.localeCompare(b.title));
  for (const subject of sorted) {
    for (const [room, visit] of Object.entries(subject.rooms).sort(([a], [b]) => a.localeCompare(b))) {
      const found: (LibraryHit & { rank: number })[] = [];
      for (const [id, node] of Object.entries(visit.nodes)) {
        if (!readable(room, visit.nodes, id)) continue;
        const fields: [LibraryHit['field'], string][] = [['title', node.title ?? ''], ['hook', node.hook ?? '']];
        if (node.state !== 'open') fields.push(['content', node.content ?? '']);
        const folded = fields.map(([, text]) => fold(text));
        if (!terms.every(term => folded.some(f => f.includes(term)))) continue;
        const index = folded.findIndex(f => f.includes(terms[0]));
        const [field, text] = fields[index];
        const at = folded[index].indexOf(terms[0]);
        found.push({ subjectId: subject.id, subjectTitle: subject.title, room, nodeId: id, nodeTitle: node.title ?? '', field,
          snippet: field === 'title' ? node.hook ?? '' : snippet(text, at, terms[0].length), rank: index });
      }
      if (!found.length && terms.every(term => fold(subject.title).includes(term)) && visit.nodes[visit.rootId])
        found.push({ subjectId: subject.id, subjectTitle: subject.title, room, nodeId: visit.rootId, nodeTitle: visit.nodes[visit.rootId].title ?? '', field: 'subject', snippet: visit.nodes[visit.rootId].hook ?? '', rank: 0 });
      found.sort((a, b) => a.rank - b.rank || (a.nodeId === visit.rootId ? -1 : b.nodeId === visit.rootId ? 1 : 0) || a.nodeTitle.localeCompare(b.nodeTitle));
      for (const { rank: _, ...hit } of found.slice(0, PER_SUBJECT)) { hits.push(hit); if (hits.length >= limit) return hits; }
    }
  }
  return hits;
}

/** WG-82: `text` cut into the parts the query's words match (`hit`) and the rest, for highlighting. */
export function marks(text: string, query: string): { text: string; hit: boolean }[] {
  const folded = fold(text), terms = words(query), on = new Array<boolean>(text.length).fill(false);
  for (const term of terms) for (let at = folded.indexOf(term); at >= 0; at = folded.indexOf(term, at + term.length)) on.fill(true, at, at + term.length);
  const parts: { text: string; hit: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts.at(-1);
    if (last && last.hit === on[i]) last.text += text[i]; else parts.push({ text: text[i], hit: on[i] });
  }
  return parts;
}

/** WG-82: results grouped by subject (and room), in the order they came. */
export function groupHits<H extends LibraryHit>(hits: H[]): { key: string; subjectId: string; subjectTitle: string; room: string; hits: H[] }[] {
  const groups = new Map<string, { key: string; subjectId: string; subjectTitle: string; room: string; hits: H[] }>();
  for (const hit of hits) {
    const key = `${hit.room}:${hit.subjectId}`;
    if (!groups.has(key)) groups.set(key, { key, subjectId: hit.subjectId, subjectTitle: hit.subjectTitle, room: hit.room, hits: [] });
    groups.get(key)!.hits.push(hit);
  }
  return [...groups.values()];
}
