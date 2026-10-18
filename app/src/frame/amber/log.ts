import { invoke } from '@tauri-apps/api/core';
import type { Effort, Usage } from '../../core/model';
/** CO-42: what a question is about; `null` before the tag closed (an error or a cancel). */
export type AmberCategory = 'app' | 'subject' | 'general';
/** CO-47: one line of `amber-log.jsonl`, beside `state.json`. Never a subject's log or token counts. */
export interface AmberLogRecord {
  at: string; requestId: string; kind: 'ask' | 'selection'; model: string; effort: Effort; promptVersion: string;
  /** The category the reply named; a missing or broken tag reads `general` and sets `tagOk` false (CO-42). */
  category: AmberCategory | null; tagOk: boolean;
  usage: Usage; durationMs: number; costUsd?: number; outcome: 'ok' | 'cancelled' | 'error'; errorKind?: string;
  /** CE-27: the endpoint answered with another model name than `model`. */
  servedModel?: string;
}
/** `models` (CE-53): per resolved model, so the panel can tell local tokens from Claude's. */
export interface AmberTotals { input: number; output: number; calls: number; models?: Record<string, { input: number; output: number }> }
export const zeroTotals = (): AmberTotals => ({ input: 0, output: 0, calls: 0 });

/** Sums what *Settings → Companion* shows, counted as a subject's tokens are (input and output); a record without usable numbers counts as a call with no tokens. */
export function totalsOf(records: readonly unknown[]): AmberTotals {
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0;
  return records.reduce<AmberTotals>((t, r) => {
    const usage = (r as { usage?: Partial<Usage> } | null)?.usage ?? {}, model = (r as { model?: unknown } | null)?.model;
    const next: AmberTotals = { input: t.input + num(usage.input), output: t.output + num(usage.output), calls: t.calls + 1, ...(t.models ? { models: t.models } : {}) };
    if (typeof model === 'string') { const m = { ...(next.models ?? {}) }; m[model] = { input: (m[model]?.input ?? 0) + num(usage.input), output: (m[model]?.output ?? 0) + num(usage.output) }; next.models = m; }
    return next;
  }, zeroTotals());
}

export interface AmberLog { append(record: AmberLogRecord): Promise<void>; totals(): Promise<AmberTotals> }
export const desktopAmberLog: AmberLog = {
  append: record => invoke('append_amber_log', { record }),
  totals: () => invoke<AmberTotals>('amber_log_totals')
};
const KEY = 'lantern.amberLog';
const read = (): unknown[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
/** Browser build surrogate (fake-provider tests). */
export const browserAmberLog: AmberLog = {
  async append(record) { localStorage.setItem(KEY, JSON.stringify([...read(), record])); },
  async totals() { return totalsOf(read()); }
};
