// lantern/2 wire format (DM-60..68). Room values (kind, state, task, data) belong in rooms/ (DM-66).
export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
/** Tone presets shared by the rooms that use a tone; the core never reads it. */
export type Tone = 'eli5' | 'curious' | 'student' | 'engineer' | 'expert' | { custom: string };
/** DM-63: neutral roles for every room. */
export type Role = 'user' | 'model';
/** Room-owned fields (DM-61, DM-62, DM-64); absent means {}. */
export type Data = Record<string, unknown>;
// Only imported PoC text uses unknown: the old format recorded no provenance (ST-40).
export type Author = { kind: 'model'; model: string; effort?: Effort; generationId: string }
  | { kind: 'user'; by: string } | { kind: 'unknown' };
export interface Edit { by: string; at: string }
export interface Turn { role: Role; text: string; at: string; author: Author; previous?: string; edited?: Edit }
export interface GraphNode {
  id: string; parents: string[]; title: string; hook: string; kind: string; state: string;
  content: string; author?: Author; previous?: string; edited?: Edit;
  dialogue: Turn[]; createdAt: string; createdBy: Role; data?: Data;
}
export interface Usage { input: number; output: number; thinking: number; cacheRead: number; cacheWrite: number }
export interface Generation {
  id: string; nodeId: string; task: string; model: string; effort: Effort; promptVersion: string; startedAt: string;
  durationMs: number; usage: Usage; costUsd?: number; outcome: 'ok' | 'cancelled' | 'error';
  toolCalls?: Record<string, number>; data?: Data;
  /** CE-27: the endpoint answered with another model name than `model`, the one asked for. */
  servedModel?: string;
}
export interface RoomVisit {
  model: string; effort: Effort; focusId: string; rootId: string;
  nodes: Record<string, GraphNode>; log: Generation[]; data?: Data;
}
export const FORMAT = 'lantern/2';
export interface Subject { format: typeof FORMAT; id: string; title: string; createdAt: string; rooms: Record<string, RoomVisit> }
// DM-10: strictly increasing, so nodes created by one reply keep their creation order.
let lastNow = 0;
export const now = () => { lastNow = Math.max(Date.now(), lastNow + 1); return new Date(lastNow).toISOString(); };
/** Wire data is JSON; this also snapshots reactive UI proxies without a UI dependency. */
export const cloneJson = <T>(value: T): T => JSON.parse(JSON.stringify(value));
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
export const DIRECTION_LIMIT = 500;
/** WG-9: trimmed at the ends, line breaks kept; empty is no direction. */
export function checkedDirection(text: string): string {
  text = text.trim();
  if ([...text].length > DIRECTION_LIMIT) throw new Error(`Direction must contain at most ${DIRECTION_LIMIT} characters`);
  return text;
}
/** The room supplies its visit data and its root's kind and state (RS-3 newSubject). */
export function createSubject(title: string, room: string, visit: { model: string; effort: Effort; data: Data; root: { kind: string; state: string; data?: Data } }, by = ''): Subject {
  title = checkedTitle(title);
  const id = newId(), at = now(), { kind, state, data } = visit.root;
  return { format: FORMAT, id: subjectId(title), title, createdAt: at, rooms: {
    [room]: { model: visit.model, effort: visit.effort, data: visit.data, focusId: id, rootId: id, log: [], nodes: {
      [id]: { id, parents: [], title, hook: '', kind, state, content: '', author: { kind: 'user', by }, dialogue: [], createdAt: at, createdBy: 'user', ...(data ? { data } : {}) }
    } }
  } };
}
/** Validate untrusted JSON before treating it as a Subject (the core only, DM-66). No recursive traversal. */
export function parseSubject(input: unknown): Subject {
  const s = input as Subject;
  if (!s || s.format !== FORMAT || typeof s.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id)
    || typeof s.title !== 'string' || !s.title.trim() || !validDate(s.createdAt) || !s.rooms || typeof s.rooms !== 'object' || Array.isArray(s.rooms)) throw new Error('Invalid lantern/2 subject');
  if (!Object.keys(s.rooms).length) throw new Error('Subject has no room visit');
  for (const visit of Object.values(s.rooms)) validateVisit(visit);
  return s;
}
const efforts: Effort[] = ['low', 'medium', 'high', 'xhigh', 'max'];
const roles: Role[] = ['user', 'model'];
export const validDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
export const validTone = (tone: unknown) => ['eli5', 'curious', 'student', 'engineer', 'expert'].includes(tone as string)
  || (!!tone && typeof tone === 'object' && typeof (tone as { custom?: unknown }).custom === 'string' && [...(tone as { custom: string }).custom].length <= 300);
const optionalObject = (value: unknown) => value === undefined || (!!value && typeof value === 'object' && !Array.isArray(value));
const nonEmpty = (value: unknown) => typeof value === 'string' && !!value;
function validAuthor(a: Author | undefined): boolean {
  return !!a && (a.kind === 'unknown' || (a.kind === 'user' && typeof a.by === 'string')
    || (a.kind === 'model' && typeof a.model === 'string' && !!a.model && typeof a.generationId === 'string' && !!a.generationId && (a.effort === undefined || efforts.includes(a.effort))));
}
export function validateVisit(v: RoomVisit): void {
  if (!v || !v.nodes || Array.isArray(v.nodes) || typeof v.nodes !== 'object' || !Array.isArray(v.log)
    || typeof v.model !== 'string' || !v.model || !efforts.includes(v.effort) || !optionalObject(v.data)) throw new Error('Invalid room visit');
  const nodes = Object.values(v.nodes);
  if (nodes.filter(n => Array.isArray(n.parents) && !n.parents.length).length !== 1 || !Object.hasOwn(v.nodes, v.rootId)
    || !Object.hasOwn(v.nodes, v.focusId)) throw new Error('Visit needs one root and an existing focus');
  for (const [id, n] of Object.entries(v.nodes)) {
    if (!n || n.id !== id || !id || !Array.isArray(n.parents) || n.parents.length !== (id === v.rootId ? 0 : 1)
      || n.parents.some(p => typeof p !== 'string' || !Object.hasOwn(v.nodes, p))) throw new Error('Invalid node id or parent');
    if (!nonEmpty(n.kind) || !nonEmpty(n.state) || typeof n.title !== 'string' || !n.title.trim()
      || typeof n.hook !== 'string' || typeof n.content !== 'string' || !validDate(n.createdAt)
      || !roles.includes(n.createdBy) || !Array.isArray(n.dialogue) || !optionalObject(n.data)) throw new Error('Invalid node fields');
    if ((n.content || n.author) && !validAuthor(n.author)) throw new Error('Missing content author');
    for (const t of n.dialogue) {
      if (!t || !roles.includes(t.role) || typeof t.text !== 'string' || !validDate(t.at) || !validAuthor(t.author)
        || (t.role === 'user' && (t.author.kind === 'model' || t.previous !== undefined || t.edited !== undefined))
        || (t.role === 'model' && t.author.kind === 'user')) throw new Error('Invalid dialogue turn');
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
      || !nonEmpty(g.task) || typeof g.model !== 'string' || !g.model
      || !efforts.includes(g.effort) || typeof g.promptVersion !== 'string' || !validDate(g.startedAt)
      || !Number.isFinite(g.durationMs) || g.durationMs < 0 || !['ok', 'cancelled', 'error'].includes(g.outcome)
      || !optionalObject(g.data) || !optionalObject(g.toolCalls) || Object.values(g.toolCalls ?? {}).some(n => !Number.isInteger(n) || n < 0)
      || !g.usage || ['input', 'output', 'thinking', 'cacheRead', 'cacheWrite'].some(k => !Number.isFinite(g.usage[k as keyof Usage]) || g.usage[k as keyof Usage] < 0)) throw new Error('Invalid generation record');
    logs.add(g.id); // nodeId may refer to a deleted node: the log is permanent.
  }
}
/** DM-68: lantern/1 to lantern/2, as the Rust layer does; used by the browser build's storage. */
export function convertV1(input: unknown): unknown {
  const s = cloneJson(input) as { format?: unknown; rooms?: Record<string, Record<string, unknown>> };
  if (!s || s.format !== 'lantern/1' || !s.rooms || typeof s.rooms !== 'object') return input;
  const role = (r: unknown) => r === 'learner' ? 'user' : r === 'tutor' ? 'model' : r;
  const take = (from: Record<string, unknown>, field: string, to: Data) => {
    if (!Object.hasOwn(from, field)) return;
    const value = from[field]; delete from[field];
    if (value !== null && value !== undefined) to[field] = value;
  };
  s.format = FORMAT;
  for (const visit of Object.values(s.rooms)) {
    const data: Data = {}; take(visit, 'tone', data); take(visit, 'direction', data);
    for (const n of Object.values((visit.nodes ?? {}) as Record<string, Record<string, unknown>>)) {
      const nodeData: Data = {}; take(n, 'understoodBy', nodeData); if (Object.keys(nodeData).length) n.data = nodeData;
      n.createdBy = role(n.createdBy);
      for (const t of (Array.isArray(n.dialogue) ? n.dialogue : []) as Record<string, unknown>[]) t.role = role(t.role);
    }
    for (const g of (Array.isArray(visit.log) ? visit.log : []) as Record<string, unknown>[]) {
      const recordData: Data = {}; take(g, 'tone', recordData); if (Object.keys(recordData).length) g.data = recordData;
    }
    visit.data = data;
  }
  return s;
}
/** ST-7: the room-neutral visit summary, as the Rust layer computes it; used by the browser build. */
export interface VisitSummary {
  states: Record<string, number>; kindStates: Record<string, Record<string, number>>; nodeData: Record<string, Record<string, number>>; data: Data;
  input: number; output: number; tokens: number; mainModel: string | null; modelOutputs: Record<string, number>;
  /** CE-53: input tokens per resolved model, so local tokens can be told from Claude's. */
  modelInputs: Record<string, number>; generations: number;
}
export function visitSummary(v: RoomVisit): VisitSummary {
  const states: Record<string, number> = {}, kindStates: Record<string, Record<string, number>> = {}, nodeData: Record<string, Record<string, number>> = {};
  for (const n of Object.values(v.nodes)) {
    states[n.state] = (states[n.state] ?? 0) + 1; (kindStates[n.kind] ??= {})[n.state] = (kindStates[n.kind][n.state] ?? 0) + 1;
    for (const [key, value] of Object.entries(n.data ?? {})) {
      if (typeof value === 'string' && [...value].length <= 64) (nodeData[key] ??= {})[value] = (nodeData[key][value] ?? 0) + 1;
    }
  }
  // Short strings, numbers, booleans, objects and arrays up to 4 KB (a tone, a pick, a history); long texts such as a direction stay in the file.
  const data = Object.fromEntries(Object.entries(v.data ?? {}).filter(([, value]) => typeof value === 'string' ? [...value].length <= 64
    : typeof value === 'number' || typeof value === 'boolean' || (!!value && typeof value === 'object' && new TextEncoder().encode(JSON.stringify(value)).length <= 4096)));
  const modelOutputs: Record<string, number> = {}, modelInputs: Record<string, number> = {}, latest = new Map<string, number>();
  let input = 0, output = 0;
  v.log.forEach((g, i) => { input += g.usage.input; output += g.usage.output; modelOutputs[g.model] = (modelOutputs[g.model] ?? 0) + g.usage.output; modelInputs[g.model] = (modelInputs[g.model] ?? 0) + g.usage.input; latest.set(g.model, i); });
  const mainModel = Object.keys(modelOutputs).sort((a, b) => modelOutputs[b] - modelOutputs[a] || latest.get(b)! - latest.get(a)!)[0] ?? null;
  return { states, kindStates, nodeData, data, input, output, tokens: input + output, mainModel, modelOutputs, modelInputs, generations: v.log.length };
}
