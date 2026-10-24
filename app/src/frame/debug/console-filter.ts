// DC-10, DC-13, DC-15: pure helpers for the debug console (formatting, filtering, searching).
import type { CallEntry, TraceEntry, TraceKind } from './trace.svelte';

export const KINDS: readonly TraceKind[] = ['call', 'action', 'event', 'warn', 'error'];
/** Lines a long text shows before "show all" (DC-13). */
export const FOLD_LINES = 6;

export interface ConsoleFilter { kinds: Record<TraceKind, boolean>; origins: string[]; text: string }
export const emptyFilter = (): ConsoleFilter => ({ kinds: { call: true, action: true, event: true, warn: true, error: true }, origins: [], text: '' });
export const isFiltering = (f: ConsoleFilter) => f.origins.length > 0 || f.text.trim() !== '' || KINDS.some(k => !f.kinds[k]);

const pad = (n: number, width = 2) => String(n).padStart(width, '0');
/** DC-10: `HH:MM:SS.mmm`, local time. */
export function formatTime(at: number): string {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}
/** DC-21.4: a rough token estimate, about three characters per token. */
export const estimateTokens = (chars: number) => Math.ceil(chars / 3);
export function formatTokens(n: number): string {
  if (n < 1000) return String(n);
  if (n < 100_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${Math.round(n / 1000)}k`;
}
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`;
}
/** A call's duration: the provider's figure when it has one, else the wall time once ended. */
export function callDuration(entry: CallEntry): number | null {
  if (entry.completion) return entry.completion.durationMs;
  return entry.endedAt ? entry.endedAt - entry.at : null;
}
/** DC-13: `in→out tok` once finished, `~` when the usage is estimated (CE-50). */
export function callTokens(entry: CallEntry): string | null {
  const c = entry.completion; if (!c) return null;
  return `${c.usageEstimated ? '~' : ''}${formatTokens(c.usage.input)}→${formatTokens(c.usage.output)} tok`;
}
/** DC-32: details as a readable text block. */
export function prettyDetail(detail: unknown): string {
  if (detail === undefined) return '';
  if (typeof detail === 'string') return detail;
  if (detail instanceof Error) return detail.stack ?? detail.message;
  try { return JSON.stringify(detail, null, 2) ?? String(detail); } catch { return String(detail); }
}
/** DC-21.6: the whole streamed text, tools shown as `⚙ Name "detail"` lines where they happened. */
export function toolLine(name: string, detail: string) { return `⚙ ${name}${detail ? ` "${detail}"` : ''}`; }

/** DC-13: the short summary on a call's line (origin is shown apart). */
export function callSummary(entry: CallEntry): string {
  return [entry.model, entry.effort].filter(Boolean).join(' · ');
}
export function summaryOf(entry: TraceEntry): string { return entry.kind === 'call' ? callSummary(entry) : entry.summary; }

/** DC-15: everything the free-text search looks at: the summary line and the texts shown once expanded. */
export function searchText(entry: TraceEntry): string {
  const parts: string[] = [entry.origin, entry.kind];
  if (entry.kind === 'call') {
    parts.push(callSummary(entry), entry.requestId, entry.system, entry.prompt);
    for (const layer of entry.tag?.layers ?? []) parts.push(layer.name, layer.text);
    if (entry.tag?.stats) parts.push(prettyDetail(entry.tag.stats));
    for (const part of entry.stream) parts.push(part.kind === 'text' ? part.text : toolLine(part.name, part.detail));
    if (entry.parsed) parts.push(prettyDetail(entry.parsed));
    if (entry.error) parts.push(entry.error.kind, entry.error.details);
  } else {
    parts.push(entry.summary, prettyDetail(entry.detail));
  }
  return parts.join('\n').toLowerCase();
}

/** Completed entries do not change, so their search text is computed once. */
export class SearchCache {
  private cache = new Map<number, string>();
  get(entry: TraceEntry): string {
    const done = entry.kind !== 'call' || entry.status !== 'running';
    if (done) { const hit = this.cache.get(entry.id); if (hit !== undefined) return hit; }
    const text = searchText(entry);
    if (done) this.cache.set(entry.id, text);
    return text;
  }
  /** Drops the ids no longer present (after a clear or the 2,000 cap). */
  prune(entries: readonly TraceEntry[]) {
    if (this.cache.size <= entries.length) return;
    const keep = new Set(entries.map(e => e.id));
    for (const id of this.cache.keys()) if (!keep.has(id)) this.cache.delete(id);
  }
}

/** DC-15: kind toggles, origins (none picked means all), and free text (every word must appear). */
export function matches(entry: TraceEntry, filter: ConsoleFilter, text: (e: TraceEntry) => string = searchText): boolean {
  if (!filter.kinds[entry.kind]) return false;
  if (filter.origins.length && !filter.origins.includes(entry.origin)) return false;
  const words = filter.text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = text(entry);
  return words.every(w => haystack.includes(w));
}
/** DC-15: the origins present, sorted. */
export function originsOf(entries: readonly TraceEntry[]): string[] {
  const seen = new Set<string>();
  for (const e of entries) seen.add(e.origin);
  return [...seen].sort();
}
/** DC-13: long texts start folded to their first lines. */
export function fold(text: string, lines = FOLD_LINES, chars = FOLD_LINES * 160): { head: string; hidden: number } {
  const all = text.split('\n');
  let head = all.length <= lines + 1 ? text : all.slice(0, lines).join('\n');
  if (head.length > chars) head = head.slice(0, chars);
  /** Lines not shown (at least 1 when only a long line was cut). */
  const hidden = head.length === text.length ? 0 : Math.max(1, all.length - head.split('\n').length);
  return { head, hidden };
}
/** DC-11: the console height, between 120 px and 70 % of the window. */
export function clampHeight(height: number, windowHeight: number): number {
  const max = Math.max(120, Math.floor(windowHeight * 0.7));
  return Math.round(Math.min(max, Math.max(120, height)));
}
