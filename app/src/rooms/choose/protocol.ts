import { normalizeTitle } from '../../core/model';
import type { RoomVisit } from '../../core/model';
import { nodesOfKind, validSource } from './rules';
import type { Fact, NodeKind, Source, Task } from './rules';
export type { Task };

/** CP-30: options and branch kinds; an unknown kind takes `concept`. */
export type OptionKind = 'concept' | 'need' | 'criterion' | 'family';
export const optionKinds: OptionKind[] = ['concept', 'need', 'criterion', 'family'];
export interface Option { title: string; hook: string; kind: OptionKind }
export interface ProductEntry { title: string; hook: string; family: string; facts: Fact[] }
export interface CellEntry { product: string; criterion: string; value: string | null; note?: string; disagree?: true; sources: Source[] }
export interface NeedEntry { question: string; answer: string }
export const confidences = ['low', 'medium', 'high'] as const;
export interface Recommendation { product: string | null; confidence: typeof confidences[number]; missing: string[] }
/** CP-31: what the source checks need besides the block. */
export interface Check { today: string; web: boolean }

const TAGS = ['options', 'products', 'cells', 'facts', 'need', 'branch', 'recommend'] as const;
type Tag = typeof TAGS[number];
const OPENERS = TAGS.map(tag => `<${tag}>`);
/** TP-30: a block in a task that does not allow it is ignored. */
const ALLOWED: Record<Task, Tag[]> = { intro: ['options'], light: ['options'], more: ['options'], reply: ['need', 'branch'], find: ['products'],
  fill: ['cells'], check: ['facts', 'cells'], recommend: ['recommend'] };

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const str = (value: unknown) => typeof value === 'string' ? value.trim() : '';
/** At most `max` code points (what validateChoose counts), with an ellipsis when cut. */
export const fit = (text: string, max: number) => { const chars = [...text]; return chars.length > max ? chars.slice(0, max - 1).join('') + '…' : text; };
const oneLine = (text: string) => text.replace(/\s*\n\s*/g, ' ');

/** TP-32, CP-32: shared by streaming and final storage; also cuts at the new tags. (The web rule of CP-32 is the session's.) */
export function visibleText(raw: string): string {
  let text = raw.split(new RegExp(OPENERS.join('|')), 1)[0].trimEnd();
  const fences = text.match(/^[ \t]*```[^\n]*$/gm) ?? [];
  if (fences.length % 2) text = text.replace(/(?:^|\n)[ \t]*```[^\n]*[ \t]*$/, '');
  const last = text.lastIndexOf('<'), tail = text.slice(last);
  if (last >= 0 && !tail.includes('>') && OPENERS.some(tag => tag.startsWith(tail))) text = text.slice(0, last);
  return text.trim();
}
const decode = (raw: string): unknown => JSON.parse(raw.split('\n').filter(line => !line.trimStart().startsWith('```')).join('\n'));
/** TP-31: every block of the tag that parses, in order. */
function blocks(raw: string, tag: Tag): unknown[] {
  const found: unknown[] = [];
  for (const match of raw.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))) try { found.push(decode(match[1])); } catch { /* Next block. */ }
  return found;
}

function option(value: unknown): Option | null {
  if (!isObject(value) || !str(value.title)) return null;
  return { title: fit(str(value.title), 80), hook: fit(oneLine(str(value.hook)), 160), kind: optionKinds.includes(value.kind as OptionKind) ? value.kind as OptionKind : 'concept' };
}
/** CP-4, CP-31.3: a source of the wrong shape, an invalid or future date, or a `model` source in a web task is dropped. */
function source(value: unknown, { today, web }: Check): Source | null {
  if (!isObject(value)) return null;
  const s: Record<string, unknown> = { kind: value.kind, name: typeof value.name === 'string' ? fit(value.name.trim(), 80) : value.name, read: value.read };
  if (value.kind !== 'model' && typeof value.url === 'string' && /^https:\/\/\S+$/.test(value.url)) s.url = value.url;
  if (str(value.value)) s.value = fit(oneLine(str(value.value)), 160);
  if (!validSource(s) || (s.kind === 'model' && web)) return null;
  return s.read as string > (s.kind === 'model' ? today.slice(0, 7) : today) ? null : s;
}
/** CP-31.1, .2: the sources that stay, and whether any of them can carry a value (not only `sponsored`). */
export function checkSources(raw: unknown, check: Check): { sources: Source[]; usable: boolean } {
  const sources = (Array.isArray(raw) ? raw : []).map(s => source(s, check)).filter((s): s is Source => !!s);
  return { sources, usable: sources.some(s => s.kind !== 'sponsored') };
}
/** CP-31: a fact with no usable source is dropped (a fact has no null). */
export function factEntry(value: unknown, check: Check): Fact | null {
  if (!isObject(value)) return null;
  const label = fit(oneLine(str(value.label)), 60), text = fit(oneLine(str(value.value)), 160), { sources, usable } = checkSources(value.sources, check);
  return label && text && usable ? { label, value: text, sources } : null;
}
/** CP-5, CP-31: a value with no usable source is stored as null; `disagree` only counts on a value. */
export function cellEntry(value: unknown, check: Check): CellEntry | null {
  if (!isObject(value) || !str(value.product) || !str(value.criterion) || (value.value !== null && typeof value.value !== 'string')) return null;
  const { sources, usable } = checkSources(value.sources, check), text = oneLine(str(value.value)), found = text && usable ? fit(text, 160) : null, note = fit(oneLine(str(value.note)), 200);
  return { product: str(value.product), criterion: str(value.criterion), value: found, ...(note ? { note } : {}), ...(found !== null && value.disagree === true ? { disagree: true as const } : {}), sources };
}
function productEntry(value: unknown, check: Check): ProductEntry | null {
  if (!isObject(value) || !str(value.title)) return null;
  const facts = (Array.isArray(value.facts) ? value.facts : []).map(f => factEntry(f, check)).filter((f): f is Fact => !!f).slice(0, 12);
  return { title: fit(str(value.title), 80), hook: fit(oneLine(str(value.hook)), 160), family: fit(oneLine(str(value.family)), 80), facts };
}
function recommendation(value: unknown): Recommendation | null {
  if (!isObject(value)) return null;
  const confidence = confidences.find(c => c === value.confidence) ?? 'low';
  return { product: str(value.product) || null, confidence, missing: (Array.isArray(value.missing) ? value.missing : []).map(m => fit(oneLine(str(m)), 120)).filter(Boolean).slice(0, 8) };
}
/** First block of the tag whose JSON is an array (or an object), mapped by `entry`; `valid` says a usable block was there. */
function listOf<T>(raw: string, tag: Tag, entry: (v: unknown) => T | null) {
  const list = blocks(raw, tag).find(Array.isArray) as unknown[] | undefined;
  return { valid: !!list, list: (list ?? []).map(entry).filter((v): v is T => v !== null) };
}

/** TP-31..35, CP-30..32: plain data; applying it to the graph is the session's job. `focusKind` tells `light` on a need or criterion has no options. */
export function parseReply(raw: string, task: Task, check: Check & { focusKind?: NodeKind }) {
  const text = visibleText(raw), allowed = ALLOWED[task];
  const options = listOf(raw, 'options', option), products = listOf(raw, 'products', v => productEntry(v, check)), cells = listOf(raw, 'cells', v => cellEntry(v, check)), facts = listOf(raw, 'facts', v => factEntry(v, check));
  const noOptions = task === 'light' && (check.focusKind === 'need' || check.focusKind === 'criterion');
  const first = <T>(tag: Tag, entry: (v: unknown) => T | null) => blocks(raw, tag).map(entry).find(v => v !== null) ?? null;
  const need = allowed.includes('need') ? first('need', v => isObject(v) && str(v.question) && str(v.answer) ? { question: fit(oneLine(str(v.question)), 200), answer: fit(str(v.answer), 500) } : null) : null;
  return {
    text: ['more', 'fill'].includes(task) ? '' : text,
    options: allowed.includes('options') && !noOptions ? options.list : [], optionsValid: allowed.includes('options') && !noOptions && options.valid,
    products: allowed.includes('products') ? products.list : [], productsValid: allowed.includes('products') && products.valid,
    cells: allowed.includes('cells') ? cells.list : [], cellsValid: allowed.includes('cells') && cells.valid,
    facts: allowed.includes('facts') ? facts.list : [], factsValid: allowed.includes('facts') && facts.valid,
    need: need as NeedEntry | null, branch: allowed.includes('branch') ? first('branch', option) : null,
    recommend: allowed.includes('recommend') ? first('recommend', recommendation) : null,
    emptyError: ['intro', 'light', 'reply', 'check', 'recommend'].includes(task) && !text,
  };
}

const knownTitles = (v: RoomVisit) => new Set(Object.values(v.nodes).map(n => normalizeTitle(n.title)));
/** LR-61, LR-62 (CP-30.1): drops titles that match any node in any state (dismissed included) or an earlier item, keeps the first `limit`. */
export function fresh<T extends { title: string }>(v: RoomVisit, items: T[], limit = 3): T[] {
  const seen = knownTitles(v), kept: T[] = [];
  for (const item of items) { const key = normalizeTitle(item.title); if (!seen.has(key) && kept.length < limit) { seen.add(key); kept.push(item); } }
  return kept;
}
/** CP-30.2: where a new product goes: under `parentId`, or under a family of this title to create under the subject first. */
export interface Placement { product: ProductEntry; parentId?: string; newFamily?: string }
export function placeProducts(v: RoomVisit, entries: ProductEntry[], focusId: string): Placement[] {
  const families = nodesOfKind(v, 'family'), titles = knownTitles(v);
  const onFamily = v.nodes[focusId]?.kind === 'family';
  return fresh(v, entries).map((product): Placement => {
    if (onFamily) return { product, parentId: focusId };
    const name = product.family, byId = name ? v.nodes[name] : undefined;
    const hit = byId?.kind === 'family' ? byId : name ? families.find(f => normalizeTitle(f.title) === normalizeTitle(name)) : undefined;
    if (hit) return { product, parentId: hit.id };
    return name && !titles.has(normalizeTitle(name)) ? { product, newFamily: name } : { product, parentId: v.rootId };
  });
}
/** CP-30.3: only cells listed in TARGET are written. */
export const inTarget = (entries: CellEntry[], target: { productId: string; criterionId: string }[]) =>
  entries.filter((e, i) => target.some(t => t.productId === e.product && t.criterionId === e.criterion) && entries.findIndex(o => o.product === e.product && o.criterion === e.criterion) === i);
/** CP-41, CP-30.3 (check): cells of a product still shortlisted or chosen and a criterion still must or nice; first entry per cell wins. */
export function liveCells(v: RoomVisit, entries: CellEntry[]): CellEntry[] {
  return entries.filter((e, i) => ['shortlisted', 'chosen'].includes(v.nodes[e.product]?.kind === 'product' ? v.nodes[e.product].state : '')
    && v.nodes[e.criterion]?.kind === 'criterion' && ['must', 'nice'].includes(v.nodes[e.criterion].state)
    && entries.findIndex(o => o.product === e.product && o.criterion === e.criterion) === i);
}
/** CP-30.5: `product` must be a shortlisted or chosen product's id, otherwise it reads as null. */
export const recommendedProduct = (v: RoomVisit, r: Recommendation | null): string | null =>
  r?.product && v.nodes[r.product]?.kind === 'product' && ['shortlisted', 'chosen'].includes(v.nodes[r.product].state) ? r.product : null;
/** Parse links without changing stored text, as Learn (TP-33). */
export { nodeLinks } from '../learn/protocol';
