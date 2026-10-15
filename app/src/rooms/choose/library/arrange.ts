import type { SubjectSummary } from '../../../frame/catalogue';
import type { Status } from '../rules';
import { chooseOf } from '../summary';

/** CR-12: the Gallery's status tabs and sorts, over the cards the name filter left. */
export type Tab = Status | 'all';
export type SortKey = 'lastOpened' | 'created' | 'status' | 'nearest' | 'title';
export const sortKeys: SortKey[] = ['lastOpened', 'created', 'status', 'nearest', 'title'];
const order: Status[] = ['exploring', 'decided', 'bought'];
export const statusOf = (s: SubjectSummary): Status => chooseOf(s)?.status ?? 'exploring';
const time = (at?: string) => at && Number.isFinite(Date.parse(at)) ? Date.parse(at) : 0;
/** Decided and bought come before exploring subjects; among those still exploring, the fewer missing items the nearer. */
export function nearness(s: SubjectSummary): number {
  const c = chooseOf(s), status = c?.status ?? 'exploring';
  return status === 'exploring' ? 1 / (1 + (c?.missing.length ?? 99)) : 2 + order.indexOf(status);
}
/** Each key sorts to its natural order (newest first, exploring first, nearest first, A to Z); `reverse` flips it, ties included. */
export function arrange(cards: readonly SubjectSummary[], tab: Tab, sort: SortKey, reverse: boolean, lastOpenedAt: Record<string, string>): SubjectSummary[] {
  const key = (s: SubjectSummary): number | string => sort === 'lastOpened' ? -time(lastOpenedAt[s.id]) : sort === 'created' ? -time(s.createdAt)
    : sort === 'status' ? order.indexOf(statusOf(s)) * 1e15 - time(lastOpenedAt[s.id]) : sort === 'nearest' ? -nearness(s) : s.title.toLocaleLowerCase();
  const sign = reverse ? -1 : 1;
  return cards.filter(s => tab === 'all' || statusOf(s) === tab).sort((a, b) => {
    const x = key(a), y = key(b);
    return (x < y ? -1 : x > y ? 1 : a.title.localeCompare(b.title) || a.id.localeCompare(b.id)) * sign;
  });
}
export function counts(cards: readonly SubjectSummary[]): Record<Tab, number> {
  const out: Record<Tab, number> = { all: cards.length, exploring: 0, decided: 0, bought: 0 };
  for (const s of cards) out[statusOf(s)]++;
  return out;
}
