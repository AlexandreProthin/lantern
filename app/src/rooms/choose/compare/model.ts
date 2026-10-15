import type { GraphNode, RoomVisit } from '../../../core/model';
import { cells, cellStatus, nodesOfKind, sourceKinds } from '../rules';
import type { Cell, Source, SourceKind } from '../rules';
import { strings } from './strings';

export type Group = 'must' | 'nice' | 'irrelevant';
export interface Row { id: string; title: string; why: string; state: Group; price: boolean }
export const groupOrder: Group[] = ['must', 'nice', 'irrelevant'];
export const slotKey = (productId: string, criterionId: string) => `${productId}:${criterionId}`;
/** The session's key for a cell being filled (`session.filling()`). */
export const fillKey = (productId: string, criterionId: string) => `${productId}×${criterionId}`;
const byAge = (a: GraphNode, b: GraphNode) => a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
export const splitKey = (key: string) => { const [productId, criterionId] = key.split(':'); return { productId, criterionId }; };

/** CR-50: the shortlisted products and the chosen one, in the order they were found. */
export const columnsOf = (v: RoomVisit): GraphNode[] => nodesOfKind(v, 'product').filter(n => n.state === 'shortlisted' || n.state === 'chosen').sort(byAge);
export const candidatesOf = (v: RoomVisit): GraphNode[] => nodesOfKind(v, 'product').filter(n => n.state === 'candidate').sort(byAge);
const rowOf = (n: GraphNode): Row => ({ id: n.id, title: n.title, why: n.hook, state: n.state as Group, price: n.data?.measure === 'price' });
/** CR-50: the ranked criteria, must first; irrelevant ones only when shown. Unranked (`open`) and dismissed criteria have no row. */
export function rowsOf(v: RoomVisit, showIrrelevant: boolean): { state: Group; rows: Row[] }[] {
  const criteria = nodesOfKind(v, 'criterion').sort(byAge);
  return groupOrder.filter(g => g !== 'irrelevant' || showIrrelevant)
    .map(state => ({ state, rows: criteria.filter(n => n.state === state).map(rowOf) })).filter(g => g.rows.length);
}
export const irrelevantCount = (v: RoomVisit) => nodesOfKind(v, 'criterion').filter(n => n.state === 'irrelevant').length;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** A source's `read` date: a day (15 Oct) or, for model knowledge, a month (Oct 2026). */
export function day(read: string): string {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(read), m = /^(\d{4})-(\d{2})$/.exec(read);
  if (d) return `${Number(d[3])} ${MONTHS[Number(d[2]) - 1]}`;
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : read;
}
export const timeDay = (at: string) => { const t = new Date(at); return Number.isNaN(t.getTime()) ? at : `${t.getDate()} ${MONTHS[t.getMonth()]}`; };
/** CR-42 rule 5: sponsored sources are shown, struck, and never used. */
export const usedSources = (c: Cell | undefined): Source[] => (c?.sources ?? []).filter(s => s.kind !== 'sponsored');
export const sponsoredSources = (c: Cell | undefined): Source[] => (c?.sources ?? []).filter(s => s.kind === 'sponsored');
/** The price caution's date: the latest read among the sources the value rests on. */
export const priceDate = (c: Cell | undefined): string | null => usedSources(c).map(s => s.read).sort().at(-1) ?? null;

/** *1 manufacturer · 2 measured · ≠ 1 · ? 1*: how well a row is known. */
export function rowSummary(products: GraphNode[], criterionId: string, filling: Set<string>): string {
  const slots = products.map(p => ({ cell: cells(p)[criterionId] as Cell | undefined, filling: filling.has(fillKey(p.id, criterionId)) }));
  const count: Partial<Record<SourceKind, number>> = {};
  for (const s of slots) for (const src of usedSources(s.cell)) count[src.kind] = (count[src.kind] ?? 0) + 1;
  const by = (status: string) => slots.filter(s => cellStatus(s.cell) === status).length;
  const parts = sourceKinds.filter(k => count[k]).map(k => `${count[k]} ${strings.kinds[k]}`);
  const [disagree, none, edited, filled] = [by('disagree'), by('none'), by('edited'), slots.filter(s => s.filling).length];
  const all = [...parts, disagree && `≠ ${disagree}`, none && `? ${none}`, edited && strings.edited(edited), filled && strings.summaryFilling(filled)].filter(Boolean);
  return all.join(' · ') || strings.noSources;
}

/** Which evidence is unfolded: whole rows, or one cell's card (exclusive, CR-51 click rules). */
export interface Open { rows: string[]; item: string | null }
export const nothingOpen: Open = { rows: [], item: null };
/** A click on a criterion folds or unfolds its row; with a single card open it folds the card and opens only that row. */
export const clickRow = (o: Open, id: string): Open => o.rows.includes(id) ? { rows: o.rows.filter(r => r !== id), item: null } : { rows: [...o.rows, id], item: null };
/** A click on the column header unfolds every row, or folds them all when every row is open. */
export const clickAll = (o: Open, ids: string[]): Open => ids.length && ids.every(id => o.rows.includes(id)) ? nothingOpen : { rows: ids, item: null };
/** A click on a cell opens only its card (unfolded rows fold); on the one open card it folds it. */
export const clickCell = (o: Open, key: string): Open => o.item === key && !o.rows.length ? nothingOpen : { rows: [], item: key };
/** Open state restricted to what is still on the board (a product removed, a row hidden or deleted). */
export function keepOpen(o: Open, rowIds: string[], productIds: string[]): Open {
  const item = o.item && productIds.includes(splitKey(o.item).productId) && rowIds.includes(splitKey(o.item).criterionId) ? o.item : null;
  const rows = o.rows.filter(r => rowIds.includes(r));
  return item === o.item && rows.length === o.rows.length ? o : { rows, item };
}

/** What a card's buttons do, for one cell. */
export interface CardActions { save: (value: string) => void; revert: () => void; check: () => void; fold: () => void }
