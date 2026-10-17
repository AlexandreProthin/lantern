import type { Tone, VisitSummary } from '../core/model';

/** WG-35/68: the storage summary is sufficient even for an expanded card. */
export interface SubjectSummary {
  id: string; title: string; path: string; createdAt?: string; tone?: Tone;
  total?: number; lit?: number; understood?: number; demonstrated?: number; self?: number; dark?: number;
  input?: number; output?: number; tokens?: number; generations?: number;
  mainModel?: string | null; modelOutputs?: Record<string, number>; modelInputs?: Record<string, number>;
  readOnly?: boolean; unreadable?: boolean; error?: string; rooms?: Record<string, VisitSummary>;
  modifiedNs?: string; size?: number;
}
export interface LibraryState { recents: string[]; lastOpenedAt: Record<string, string> }
export type CatalogueSort = 'lastOpened' | 'created' | 'progress';
const timestamp = (value?: string) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
const progress = (s: SubjectSummary) => s.total ? (s.understood ?? 0) / s.total : 0;

/** WG-32/36/68: largest remainders keep rounded shares at exactly 100%. */
export function modelShares(summary: SubjectSummary) {
  const ranked = Object.entries(summary.modelOutputs ?? {}).sort(([a, av], [b, bv]) =>
    bv - av || Number(b === summary.mainModel) - Number(a === summary.mainModel) || a.localeCompare(b));
  const total = ranked.reduce((sum, [, output]) => sum + output, 0);
  const models = ranked.map(([model, output]) => ({ model, output, share: total ? Math.floor(output / total * 100) : null,
    remainder: total ? output / total * 100 % 1 : 0 }));
  let missing = total ? 100 - models.reduce((sum, m) => sum + (m.share ?? 0), 0) : 0;
  for (const m of [...models].sort((a, b) => b.remainder - a.remainder)) if (missing-- > 0) m.share!++;
  return models.map(({ remainder: _, ...model }) => model);
}

/** WG-34: return a presentation object with usage fields absent when disabled. */
export function cardDetails(summary: SubjectSummary, lastOpenedAt: string | undefined, showTokens: boolean) {
  return { id: summary.id, title: summary.title, createdAt: summary.createdAt, lastOpenedAt, tone: summary.tone,
    total: summary.total, lit: summary.lit, understood: summary.understood, demonstrated: summary.demonstrated,
    self: summary.self, dark: summary.dark, progress: progress(summary), generations: summary.generations,
    mainModel: summary.mainModel, readOnly: summary.readOnly, unreadable: summary.unreadable, error: summary.error,
    models: modelShares(summary).map(m => showTokens ? m : { model: m.model }),
    ...(showTokens ? { input: summary.input, output: summary.output, tokens: summary.tokens } : {}) };
}

/** Session-only WG-6/53..55/60/65 state. No subject reads, UI, or persistent preferences. */
export class Catalogue {
  summaries: readonly SubjectSummary[] = [];
  state: LibraryState = { recents: [], lastOpenedAt: {} };
  sort: CatalogueSort = 'lastOpened';
  ascending = false;
  filter = '';
  appliedFilter = '';
  selectedId: string | null = null;
  private timer?: ReturnType<typeof setTimeout>;
  constructor(private changed: () => void = () => {}) {}

  replace(summaries: readonly SubjectSummary[], state: LibraryState): void {
    this.summaries = summaries; this.state = state; this.reconcileSelection(); this.changed();
  }
  get recent(): SubjectSummary[] {
    return this.order('lastOpened', false).slice(0, 3);
  }
  /** RS-15: the field's palette lists every subject, the most recently opened first. */
  get opened(): SubjectSummary[] {
    return this.order('lastOpened', false);
  }
  get visible(): SubjectSummary[] {
    const filter = this.appliedFilter.toLocaleLowerCase();
    return this.order(this.sort, this.ascending).filter(s => s.title.toLocaleLowerCase().includes(filter));
  }
  private order(sort: CatalogueSort, ascending: boolean): SubjectSummary[] {
    const value = (s: SubjectSummary) => sort === 'progress' ? progress(s)
      : timestamp(sort === 'created' ? s.createdAt : this.state.lastOpenedAt[s.id]);
    return [...this.summaries].sort((a, b) => (value(a) - value(b)) * (ascending ? 1 : -1)
      || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  }
  setSort(sort: CatalogueSort, ascending = this.ascending): void {
    this.sort = sort; this.ascending = ascending; this.changed();
  }
  setFilter(text: string): void {
    this.filter = text; clearTimeout(this.timer);
    if (!text) this.applyFilter(); // Escape/Clear takes effect immediately; no stale queued filter.
    else { this.timer = setTimeout(() => this.applyFilter(), 150); this.changed(); }
  }
  private applyFilter(): void {
    this.appliedFilter = this.filter; this.reconcileSelection(); this.changed();
  }
  private reconcileSelection(): void {
    if (this.selectedId && !this.visible.some(s => s.id === this.selectedId)) this.selectedId = null;
  }
  select(id: string | null): void {
    this.selectedId = id && this.visible.some(s => s.id === id) ? id : null; this.changed();
  }
  move(key: string, columns: number): void {
    if (key === 'Escape') { this.select(null); return; }
    const cards = this.visible;
    if (!cards.length || !['Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) return;
    columns = Math.max(1, Math.floor(columns) || 1);
    let index = cards.findIndex(s => s.id === this.selectedId);
    if (key === 'Home' || index < 0) index = 0;
    else if (key === 'End') index = cards.length - 1;
    else if (key === 'ArrowLeft' && index % columns > 0) index--;
    else if (key === 'ArrowRight' && index % columns < columns - 1) index = Math.min(index + 1, cards.length - 1);
    else if (key === 'ArrowUp' && index >= columns) index -= columns;
    else if (key === 'ArrowDown' && index + columns < cards.length) index += columns;
    if (key === 'End') index = cards.length - 1;
    this.select(cards[index].id);
  }
  dispose(): void { clearTimeout(this.timer); }
}
