import { addChild, nodeOf } from '../../core/graph';
import { checkedDirection, createSubject, DIRECTION_LIMIT, now, validTone } from '../../core/model';
import type { Author, Effort, GraphNode, Role, RoomVisit, Subject, Tone } from '../../core/model';

/** Choose's values for the room-owned parts of lantern/2 (CP-1, CR-20, CR-21). */
export type NodeKind = 'subject' | 'concept' | 'need' | 'criterion' | 'family' | 'product' | 'own';
export type Status = 'exploring' | 'decided' | 'bought';
export const kinds: NodeKind[] = ['subject', 'concept', 'need', 'criterion', 'family', 'product', 'own'];
export const tasks = ['intro', 'light', 'more', 'reply', 'find', 'fill', 'check', 'recommend'] as const;
export type Task = typeof tasks[number];
/** CR-21: the states each kind may hold; `dismissed` only from `open` (products are rejected instead). */
export const statesOf: Record<NodeKind, string[]> = {
  subject: ['open', 'lit'], concept: ['open', 'lit', 'dismissed'], family: ['open', 'lit', 'dismissed'], own: ['open', 'lit', 'dismissed'],
  need: ['open', 'answered', 'dismissed'], criterion: ['open', 'must', 'nice', 'irrelevant', 'dismissed'],
  product: ['candidate', 'shortlisted', 'chosen', 'rejected'],
};
export const firstState = (kind: NodeKind) => kind === 'product' ? 'candidate' : 'open';

export const NOTE_LIMIT = DIRECTION_LIMIT, ANSWER_LIMIT = 500, REASON_LIMIT = 200, FACT_LIMIT = 12;
export const CELL_VALUE_LIMIT = 160, CELL_NOTE_LIMIT = 200, SOURCE_NAME_LIMIT = 80;
export const sourceKinds = ['manufacturer', 'measured', 'shop', 'opinion', 'sponsored', 'model'] as const;
export type SourceKind = typeof sourceKinds[number];
/** CP-4. */
export interface Source { kind: SourceKind; name: string; url?: string; read: string; value?: string }
export interface Fact { label: string; value: string; sources: Source[] }
export interface UserValue { value: string; at: string; by: string }
/** CP-5: the status the design shows is derived (cellStatus), never stored. */
export interface Cell { value: string | null; note?: string; disagree?: boolean; sources: Source[]; user?: UserValue; generationId: string; at: string }
export interface Locale { country: string; currency: string }
/** CP-2: `title` is the product's title at the time, so the Gallery's timeline can name it. */
export interface HistoryEntry { status: Status; at: string; productId?: string; title?: string; unchosen?: true }
/** CP-2: the last chosen product, kept after un-choosing so the Gallery can show it struck. */
/** CR-41: `source` is where the price was seen (the first source of the Price fact that is not sponsored). */
export interface Pick { productId: string; title: string; price?: string; source?: { kind: SourceKind; name: string; read: string }; at: string }
export interface ChooseData { tone: Tone; needsNote?: string; locale: Locale; status: Status; history: HistoryEntry[]; pick?: Pick }

/** Valid visits always carry these fields (validateChoose); the cast is the only place that reads visit `data`. */
export const chooseData = (v: RoomVisit) => (v.data ?? {}) as unknown as ChooseData;
export const toneOf = (v: RoomVisit): Tone => chooseData(v).tone;
export const statusOf = (v: RoomVisit): Status => chooseData(v).status;
export const kindOf = (n: GraphNode) => n.kind as NodeKind;
export const facts = (n: GraphNode) => (n.data?.facts ?? []) as Fact[];
export const cells = (n: GraphNode) => (n.data?.cells ?? {}) as Record<string, Cell>;
export const answerOf = (n: GraphNode) => n.data?.answer as UserValue & { text: string } | undefined;
export const rejectedOf = (n: GraphNode) => n.data?.rejected as { reason: string; at: string } | undefined;
export const nodesOfKind = (v: RoomVisit, kind: NodeKind) => Object.values(v.nodes).filter(n => n.kind === kind);
export const chosenOf = (v: RoomVisit) => nodesOfKind(v, 'product').find(n => n.state === 'chosen');
export function cellStatus(cell: Cell | undefined): 'ok' | 'none' | 'disagree' | 'edited' | 'empty' {
  if (!cell) return 'empty';
  return cell.user ? 'edited' : cell.value === null ? 'none' : cell.disagree ? 'disagree' : 'ok';
}
export function setTone(v: RoomVisit, tone: Tone): void { v.data = { ...v.data, tone }; }
export function setLocale(v: RoomVisit, locale: Locale): void { if (!validLocale(locale)) throw new Error('Invalid locale'); v.data = { ...v.data, locale }; }
/** CR-13, CP-2: the user's note, never split or rewritten; empty is not stored. */
export function setNeedsNote(v: RoomVisit, note: string): void {
  note = checkedDirection(note); const { needsNote: _, ...rest } = v.data ?? {}; v.data = note ? { ...rest, needsNote: note } : rest;
}

const length = (text: unknown, max: number) => typeof text === 'string' && [...text].length <= max;
const isDay = (text: unknown) => typeof text === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(text) && !Number.isNaN(Date.parse(text));
const isMonth = (text: unknown) => typeof text === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(text);
const isTime = (text: unknown) => typeof text === 'string' && !Number.isNaN(Date.parse(text));
const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export const validLocale = (l: unknown): l is Locale => isObject(l) && typeof l.country === 'string' && /^[A-Z]{2}$/.test(l.country) && typeof l.currency === 'string' && /^[A-Z]{3}$/.test(l.currency);
/** CP-4: shape only; the date rules that depend on the task and today are CP-31's (protocol.ts). */
export function validSource(s: unknown): s is Source {
  if (!isObject(s) || !sourceKinds.includes(s.kind as SourceKind) || !length(s.name, SOURCE_NAME_LIMIT) || !(s.name as string).trim()) return false;
  if (s.url !== undefined && (typeof s.url !== 'string' || !/^https:\/\/\S+$/.test(s.url))) return false;
  if (s.value !== undefined && !length(s.value, CELL_VALUE_LIMIT)) return false;
  return s.kind === 'model' ? isMonth(s.read) && s.url === undefined : isDay(s.read);
}
const validUserValue = (u: unknown) => isObject(u) && length(u.value, CELL_VALUE_LIMIT) && isTime(u.at) && typeof u.by === 'string';
export function validCell(c: unknown): c is Cell {
  return isObject(c) && (c.value === null || length(c.value, CELL_VALUE_LIMIT)) && (c.note === undefined || length(c.note, CELL_NOTE_LIMIT))
    && (c.disagree === undefined || typeof c.disagree === 'boolean') && Array.isArray(c.sources) && c.sources.every(validSource)
    && (c.user === undefined || validUserValue(c.user)) && typeof c.generationId === 'string' && isTime(c.at);
}
const validFact = (f: unknown) => isObject(f) && length(f.label, 60) && !!(f.label as string).trim() && length(f.value, CELL_VALUE_LIMIT) && Array.isArray(f.sources) && f.sources.every(validSource);
const statuses: Status[] = ['exploring', 'decided', 'bought'];
const validPick = (p: unknown) => isObject(p) && typeof p.productId === 'string' && length(p.title, 120) && (p.price === undefined || length(p.price, CELL_VALUE_LIMIT)) && isTime(p.at)
  && (p.source === undefined || (isObject(p.source) && sourceKinds.includes(p.source.kind as SourceKind) && length(p.source.name, SOURCE_NAME_LIMIT) && typeof p.source.read === 'string'));
const validHistory = (h: unknown) => isObject(h) && statuses.includes(h.status as Status) && isTime(h.at)
  && (h.productId === undefined || typeof h.productId === 'string') && (h.title === undefined || length(h.title, 120)) && (h.unchosen === undefined || (h.unchosen === true && h.status === 'exploring'));

/** DM-66, CP-7: the room's half of validation, on load and before every save. */
export function validateChoose(v: RoomVisit): void {
  const d = v.data ?? {}, fail = (what: string) => { throw new Error(`Invalid Choose ${what}`); };
  if (!validTone(d.tone) || !validLocale(d.locale) || !statuses.includes(d.status as Status) || !Array.isArray(d.history) || !d.history.every(validHistory)
    || (d.needsNote !== undefined && (!length(d.needsNote, NOTE_LIMIT) || !(d.needsNote as string))) || (d.pick !== undefined && !validPick(d.pick))) fail('visit data');
  let chosen = 0, price = 0;
  for (const n of Object.values(v.nodes)) {
    const kind = n.kind as NodeKind, data = n.data ?? {};
    if (!kinds.includes(kind) || !statesOf[kind].includes(n.state) || (kind === 'subject') !== (n.id === v.rootId)) fail('node kind or state');
    const allowed: Record<NodeKind, string[]> = { subject: [], concept: [], family: [], own: [], need: ['answer'], criterion: ['measure'], product: ['facts', 'cells', 'rejected'] };
    if (Object.keys(data).some(key => !allowed[kind].includes(key))) fail('node data');
    if (kind === 'need') {
      const a = data.answer;
      if ((n.state === 'answered') !== (a !== undefined) || (a !== undefined && !(isObject(a) && length(a.text, ANSWER_LIMIT) && !!(a.text as string).trim() && isTime(a.at) && typeof a.by === 'string'))) fail('need answer');
    }
    if (kind === 'criterion' && data.measure !== undefined) { if (data.measure !== 'price') fail('criterion measure'); price++; }
    if (kind === 'product') {
      const r = data.rejected;
      if ((n.state === 'rejected') !== (r !== undefined) || (r !== undefined && !(isObject(r) && length(r.reason, REASON_LIMIT) && !!(r.reason as string).trim() && isTime(r.at)))) fail('rejected reason');
      if (data.facts !== undefined && !(Array.isArray(data.facts) && data.facts.length <= FACT_LIMIT && data.facts.every(validFact))) fail('product facts');
      if (data.cells !== undefined && !(isObject(data.cells) && Object.values(data.cells).every(validCell))) fail('Compare cell');
      if (n.state === 'chosen') chosen++;
    }
  }
  // CR-22, CR-24: at most one pick, and the status says whether there is one.
  if (chosen > 1 || price > 1 || (chosen === 1) !== (d.status !== 'exploring')) fail('pick or status');
  const pick = chosenOf(v); if (pick && (d.pick as Pick | undefined)?.productId !== pick.id) fail('pick');
  for (const g of v.log) if (!(tasks as readonly string[]).includes(g.task) || !validTone(g.data?.tone) || typeof g.data?.web !== 'boolean') fail('generation record');
}

/** Before every save: drop orphan cells (CP-5) and refresh the pick from the chosen product (CP-2). */
export function normalize(v: RoomVisit): void { pruneCells(v); const chosen = chosenOf(v); if (chosen) writePick(v, chosen, chooseData(v).pick?.productId === chosen.id ? chooseData(v).pick!.at : now()); }
function writePick(v: RoomVisit, product: GraphNode, at: string): void {
  const fact = facts(product).find(f => f.label.toLowerCase() === 'price'), seen = fact?.sources.find(s => s.kind !== 'sponsored');
  v.data = { ...v.data, pick: { productId: product.id, title: product.title, ...(fact ? { price: fact.value } : {}), ...(seen ? { source: { kind: seen.kind, name: seen.name, read: seen.read } } : {}), at } };
}
/** CP-5: a cell whose criterion is gone is dropped on save. */
export function pruneCells(v: RoomVisit): void {
  for (const n of nodesOfKind(v, 'product')) {
    const kept = Object.fromEntries(Object.entries(cells(n)).filter(([id]) => v.nodes[id]?.kind === 'criterion'));
    if (n.data?.cells && Object.keys(kept).length !== Object.keys(n.data.cells).length) n.data = { ...n.data, cells: kept };
  }
}

function setData(n: GraphNode, key: string, value: unknown): void {
  const { [key]: _, ...rest } = n.data ?? {};
  if (value !== undefined) n.data = { ...rest, [key]: value }; else if (Object.keys(rest).length) n.data = rest; else delete n.data;
}
/** CR-21, CR-23: the transitions the room's actions make; choose, reject and need answers have their own functions. */
export function setState(v: RoomVisit, id: string, state: string): void {
  const n = nodeOf(v, id), kind = kindOf(n), from = n.state;
  const ranks = ['must', 'nice', 'irrelevant'];
  const valid = (from === 'open' && state === 'dismissed' && kind !== 'subject') || (from === 'dismissed' && state === 'open')
    || (['subject', 'concept', 'family', 'own'].includes(kind) && from === 'open' && state === 'lit')
    || (kind === 'criterion' && from !== 'dismissed' && ranks.includes(state) && from !== state)
    || (kind === 'product' && ((from === 'candidate' && state === 'shortlisted') || (from === 'shortlisted' && state === 'candidate')));
  if (!valid || !statesOf[kind].includes(state)) throw new Error('Invalid state transition');
  n.state = state;
}
/** CR-23: a need is answered, and its answer edited, in the user's words. */
export function answerNeed(v: RoomVisit, id: string, text: string, by: string): void {
  const n = nodeOf(v, id); text = text.trim();
  if (n.kind !== 'need' || !['open', 'answered'].includes(n.state) || !text || [...text].length > ANSWER_LIMIT) throw new Error('Invalid need answer');
  setData(n, 'answer', { text, at: now(), by }); n.state = 'answered';
}
export function rejectProduct(v: RoomVisit, id: string, reason: string): void {
  const n = nodeOf(v, id); reason = reason.trim();
  if (n.kind !== 'product' || !['candidate', 'shortlisted'].includes(n.state) || !reason || [...reason].length > REASON_LIMIT) throw new Error('Invalid rejection');
  setData(n, 'rejected', { reason, at: now() }); n.state = 'rejected';
}
/** A rejected product comes back as a candidate; its reason goes. */
export function restoreProduct(v: RoomVisit, id: string): void {
  const n = nodeOf(v, id); if (n.kind !== 'product' || n.state !== 'rejected') throw new Error('Product is not rejected');
  setData(n, 'rejected', undefined); n.state = 'candidate';
}
function pushStatus(v: RoomVisit, entry: HistoryEntry): void { const d = chooseData(v); v.data = { ...v.data, status: entry.status, history: [...d.history, entry] }; }
/** CR-22, CR-24: one pick; choosing another first un-chooses the current one, which goes back to shortlisted. */
export function chooseProduct(v: RoomVisit, id: string): void {
  const n = nodeOf(v, id); if (n.kind !== 'product' || !['candidate', 'shortlisted'].includes(n.state)) throw new Error('Product cannot be chosen');
  const current = chosenOf(v); if (current) unchooseProduct(v, current.id);
  n.state = 'chosen'; const at = now(); pushStatus(v, { status: 'decided', at, productId: id, title: n.title }); writePick(v, n, at);
}
export function unchooseProduct(v: RoomVisit, id: string): void {
  const n = nodeOf(v, id); if (n.state !== 'chosen') throw new Error('Product is not chosen');
  n.state = 'shortlisted'; pushStatus(v, { status: 'exploring', at: now(), productId: id, title: n.title, unchosen: true });
}
/** CR-24: *Mark as bought* on the chosen product. */
export function markBought(v: RoomVisit): void {
  const chosen = chosenOf(v); if (!chosen || statusOf(v) !== 'decided') throw new Error('Nothing to mark as bought');
  pushStatus(v, { status: 'bought', at: now(), productId: chosen.id, title: chosen.title });
}
/** CP-3: at most one criterion holds prices. */
export function setPriceCriterion(v: RoomVisit, id: string): void {
  const n = nodeOf(v, id); if (n.kind !== 'criterion') throw new Error('Not a criterion');
  for (const c of nodesOfKind(v, 'criterion')) setData(c, 'measure', c.id === id ? 'price' : undefined);
}
/** Children grow from the subject, a lit node or a family; they start in their kind's first state. */
export function addChooseChild(v: RoomVisit, parentId: string, input: { title: string; hook?: string; kind: NodeKind; createdBy: Role; author?: Author }): GraphNode {
  const parent = nodeOf(v, parentId);
  if (input.kind === 'subject' || !(parent.state === 'lit' || parent.kind === 'family' || parentId === v.rootId)) throw new Error('Parent cannot grow');
  return addChild(v, parentId, { ...input, state: firstState(input.kind) });
}
export function newChooseSubject(title: string, settings: { tone: Tone; model: string; effort: Effort; locale: Locale; needsNote?: string }, by = ''): Subject {
  const { tone, model, effort, locale } = settings, needsNote = checkedDirection(settings.needsNote ?? '');
  if (!validLocale(locale)) throw new Error('Invalid locale');
  return createSubject(title, 'choose', { model, effort, data: { tone, locale, status: 'exploring', history: [], ...(needsNote ? { needsNote } : {}) }, root: { kind: 'subject', state: 'open' } }, by);
}
