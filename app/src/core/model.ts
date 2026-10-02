// lantern/1 wire format (DM-1..40). Room behaviour belongs in rooms/, not here.
export type NodeKind = 'subject' | 'axis' | 'deeper' | 'application' | 'adjacent' | 'exercise' | 'question' | 'own';
export type NodeState = 'open' | 'lit' | 'understood' | 'dismissed';
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export type Tone = 'eli5' | 'curious' | 'student' | 'engineer' | 'expert' | { custom: string };
// Only imported PoC text uses unknown: the old format recorded no provenance (ST-40).
export type Author = { kind: 'model'; model: string; effort?: Effort; generationId: string }
  | { kind: 'user'; by: string } | { kind: 'unknown' };
export interface Edit { by: string; at: string }
export interface Turn { role: 'learner' | 'tutor'; text: string; at: string; author: Author; previous?: string; edited?: Edit }
export interface GraphNode {
  id: string; parents: string[]; title: string; hook: string; kind: NodeKind;
  state: NodeState; understoodBy: 'demonstrated' | 'self' | null;
  content: string; author?: Author; previous?: string; edited?: Edit;
  dialogue: Turn[]; createdAt: string; createdBy: 'tutor' | 'learner';
}
export interface Usage { input: number; output: number; thinking: number; cacheRead: number; cacheWrite: number }
export interface Generation {
  id: string; nodeId: string; task: 'intro' | 'light' | 'reply' | 'check' | 'more';
  model: string; effort: Effort; tone: Tone; promptVersion: string; startedAt: string;
  durationMs: number; usage: Usage; costUsd?: number; outcome: 'ok' | 'cancelled' | 'error';
}
export interface RoomVisit {
  tone: Tone; model: string; effort: Effort; focusId: string; rootId: string;
  nodes: Record<string, GraphNode>; log: Generation[];
}
export interface Subject { format: 'lantern/1'; id: string; title: string; createdAt: string; rooms: Record<string, RoomVisit> }
export const now = () => new Date().toISOString();
export const newId = () => crypto.randomUUID().replaceAll('-', '').slice(0, 8);
export const normalizeTitle = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLowerCase();
export function subjectId(title: string): string {
  const slug = normalizeTitle(title).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40).replace(/-$/, '');
  return `${slug || 'subject'}-${newId().slice(0, 4)}`;
}
export function checkedTitle(title: string, limit = 120): string {
  title = title.trim();
  if (!title || [...title].length > limit) throw new Error(`Title must contain 1–${limit} characters`);
  return title;
}
export function createSubject(title: string, room = 'learn', defaults: { tone: Tone; model: string; effort: Effort } = { tone: 'curious', model: 'opus', effort: 'medium' }, by = ''): Subject {
  title = checkedTitle(title);
  const id = newId(), at = now();
  return { format: 'lantern/1', id: subjectId(title), title, createdAt: at, rooms: {
    [room]: { ...defaults, focusId: id, rootId: id, log: [], nodes: {
      [id]: { id, parents: [], title, hook: '', kind: 'subject', state: 'open', understoodBy: null,
        content: '', author: { kind: 'user', by }, dialogue: [], createdAt: at, createdBy: 'learner' }
    } }
  } };
}
/** Validate untrusted JSON before treating it as a Subject. No recursive traversal. */
export function parseSubject(input: unknown): Subject {
  const s = input as Subject;
  if (!s || s.format !== 'lantern/1' || typeof s.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id)
    || typeof s.title !== 'string' || !s.title.trim() || !validDate(s.createdAt) || !s.rooms || typeof s.rooms !== 'object' || Array.isArray(s.rooms)) throw new Error('Invalid lantern/1 subject');
  if (!Object.keys(s.rooms).length) throw new Error('Subject has no room visit');
  for (const visit of Object.values(s.rooms)) validateVisit(visit);
  return s;
}
const kinds: NodeKind[] = ['subject', 'axis', 'deeper', 'application', 'adjacent', 'exercise', 'question', 'own'];
const states: NodeState[] = ['open', 'lit', 'understood', 'dismissed'];
const efforts: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];
const validDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
const validTone = (tone: Tone) => ['eli5', 'curious', 'student', 'engineer', 'expert'].includes(tone as string)
  || (tone && typeof tone === 'object' && typeof tone.custom === 'string' && [...tone.custom].length <= 300);
function validAuthor(a: Author | undefined): boolean {
  return !!a && (a.kind === 'unknown' || (a.kind === 'user' && typeof a.by === 'string')
    || (a.kind === 'model' && typeof a.model === 'string' && !!a.model && typeof a.generationId === 'string' && !!a.generationId && (a.effort === undefined || efforts.includes(a.effort))));
}
export function validateVisit(v: RoomVisit): void {
  if (!v || !v.nodes || Array.isArray(v.nodes) || typeof v.nodes !== 'object' || !Array.isArray(v.log)
    || !validTone(v.tone) || typeof v.model !== 'string' || !v.model || !efforts.includes(v.effort)) throw new Error('Invalid room visit');
  const nodes = Object.values(v.nodes);
  if (nodes.filter(n => Array.isArray(n.parents) && !n.parents.length).length !== 1 || !Object.hasOwn(v.nodes, v.rootId)
    || !Object.hasOwn(v.nodes, v.focusId)) throw new Error('Visit needs one root and an existing focus');
  for (const [id, n] of Object.entries(v.nodes)) {
    if (!n || n.id !== id || !id || !Array.isArray(n.parents) || n.parents.length !== (id === v.rootId ? 0 : 1)
      || n.parents.some(p => typeof p !== 'string' || !Object.hasOwn(v.nodes, p))) throw new Error('Invalid node id or parent');
    if (!kinds.includes(n.kind) || !states.includes(n.state) || typeof n.title !== 'string' || !n.title.trim()
      || typeof n.hook !== 'string' || typeof n.content !== 'string' || !validDate(n.createdAt)
      || !['tutor', 'learner'].includes(n.createdBy) || !Array.isArray(n.dialogue)) throw new Error('Invalid node fields');
    if ((n.state === 'understood') !== (n.understoodBy === 'self' || n.understoodBy === 'demonstrated')
      || (n.state !== 'understood' && n.understoodBy !== null)) throw new Error('Invalid understanding provenance');
    if ((n.content || n.author) && !validAuthor(n.author)) throw new Error('Missing content author');
    for (const t of n.dialogue) {
      if (!t || !['learner', 'tutor'].includes(t.role) || typeof t.text !== 'string' || !validDate(t.at) || !validAuthor(t.author)
        || (t.role === 'learner' && (t.author.kind === 'model' || t.previous !== undefined || t.edited !== undefined))
        || (t.role === 'tutor' && t.author.kind === 'user')) throw new Error('Invalid dialogue turn');
    }
  }
  // Each chain must terminate at the only root; memoization makes this linear.
  const complete = new Set<string>();
  for (const n of nodes) {
    const path = new Set<string>();
    let id: string | undefined = n.id;
    while (id && !complete.has(id)) {
      if (path.has(id)) throw new Error('Cycle in graph');
      path.add(id); id = v.nodes[id].parents[0];
    }
    for (const seen of path) complete.add(seen);
  }
  const logs = new Set<string>();
  for (const g of v.log) {
    if (!g || typeof g.id !== 'string' || !g.id || logs.has(g.id) || typeof g.nodeId !== 'string'
      || !['intro', 'light', 'reply', 'check', 'more'].includes(g.task) || typeof g.model !== 'string' || !g.model
      || !efforts.includes(g.effort) || !validTone(g.tone) || typeof g.promptVersion !== 'string' || !validDate(g.startedAt)
      || !Number.isFinite(g.durationMs) || g.durationMs < 0 || !['ok', 'cancelled', 'error'].includes(g.outcome)
      || !g.usage || ['input', 'output', 'thinking', 'cacheRead', 'cacheWrite'].some(k => !Number.isFinite(g.usage[k as keyof Usage]) || g.usage[k as keyof Usage] < 0)) throw new Error('Invalid generation record');
    logs.add(g.id); // nodeId may refer to a deleted node: the log is permanent.
  }
}
