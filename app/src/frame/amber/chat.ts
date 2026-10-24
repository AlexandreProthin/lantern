import { ProviderError, zeroUsage } from '../provider';
import type { InferenceProvider } from '../provider';
import type { AmberCategory, AmberLog } from './log';
import { CategoryGate } from './gate';
import { amberRequest, promptVersion } from './prompt';
import type { AmberContext, AmberHelp, AmberTurn } from './prompt';
import { trace } from '../debug/trace.svelte';

export type AmberPhase = 'idle' | 'thinking' | 'streaming' | 'error';
/** The question being answered or the last one that failed; done turns move to `turns`. */
export interface AmberPending { question: string; selection?: string; answer: string; error?: ProviderError }

/**
 * CO-40 to CO-49: Ask Amber's temporary chat. One call per question, on Amber's model at low effort with no
 * web; earlier turns go with each follow-up; closing forgets everything (nothing reaches the subject).
 */
export class AmberChat {
  turns: AmberTurn[] = [];
  pending: AmberPending | null = null;
  phase: AmberPhase = 'idle';
  private abort: AbortController | null = null;
  constructor(private provider: InferenceProvider, private log: AmberLog, private model: () => string,
    private help: () => AmberHelp, private context: () => AmberContext, private changed: () => void) {}

  async ask(question: string, selection?: string): Promise<void> {
    question = question.trim(); if (!question || this.phase === 'thinking' || this.phase === 'streaming') return;
    trace.action('amber', selection ? 'Ask about a selection' : 'Ask Amber', { chars: question.length, ...(selection ? { selectionChars: selection.length } : {}), followUp: this.turns.length });
    const pending: AmberPending = { question, selection, answer: '' }, gate = new CategoryGate(), abort = new AbortController();
    this.pending = pending; this.phase = 'thinking'; this.abort = abort; this.changed();
    const model = this.model(), requestId = crypto.randomUUID(), at = new Date().toISOString(), start = performance.now();
    const { system, prompt, layers } = amberRequest(this.help(), this.context(), this.turns, question, selection);
    const show = (text: string) => {
      if (!text || this.pending !== pending) return;
      pending.answer += text; if (this.phase === 'thinking') this.phase = 'streaming'; this.changed();
    };
    const record = (outcome: 'ok' | 'cancelled' | 'error', extra: { usage?: ReturnType<typeof zeroUsage>; durationMs?: number; costUsd?: number; model?: string; errorKind?: string; servedModel?: string }) => {
      if (gate.open && !gate.tagOk) { console.warn('Amber: missing or broken category tag, read as general', requestId); trace.warn('amber', 'Missing or broken category tag, read as general', { requestId }); }
      void this.log.append({ at, requestId, kind: selection ? 'selection' : 'ask', model: extra.model || model, effort: 'low', promptVersion,
        category: gate.category, tagOk: gate.tagOk, usage: extra.usage ?? zeroUsage(), durationMs: extra.durationMs ?? Math.round(performance.now() - start),
        ...(extra.costUsd !== undefined ? { costUsd: extra.costUsd } : {}), outcome, ...(extra.errorKind ? { errorKind: extra.errorKind } : {}), ...(extra.servedModel ? { servedModel: extra.servedModel } : {}) }).catch(e => { console.warn('Amber log', e); trace.warn('amber', 'Amber log append failed', { error: String(e) }); });
    };
    try {
      const result = await this.provider.stream({ requestId, system, prompt, model, effort: 'low', cancel: abort.signal,
        trace: { origin: selection ? 'amber·selection' : 'amber·ask', promptVersion, layers, stats: { earlierTurns: this.turns.length } } }, chunk => show(gate.push(chunk)));
      show(gate.finish());
      trace.parsed(requestId, { category: gate.category, tagOk: gate.tagOk, visibleChars: pending.answer.length, visible: pending.answer.slice(0, 200), ...(gate.tagOk ? {} : { rejected: 'missing or broken category tag' }) });
      record('ok', { usage: result.usage, durationMs: result.durationMs, costUsd: result.costUsd, model: result.model, servedModel: result.servedModel });
      if (this.pending !== pending) return;
      this.turns = [...this.turns, { question, selection, answer: pending.answer.trim(), category: gate.category as AmberCategory }];
      this.pending = null; this.phase = 'idle';
    } catch (e) {
      const error = e instanceof ProviderError ? e : new ProviderError('process-crashed', String(e));
      record(error.kind === 'cancelled' ? 'cancelled' : 'error', { usage: error.usage, durationMs: error.durationMs, model: error.model, errorKind: error.kind });
      if (this.pending !== pending) return;
      if (error.kind === 'cancelled') { this.pending = null; this.phase = 'idle'; }
      else { pending.error = error; this.phase = 'error'; }
    } finally { if (this.abort === abort) this.abort = null; this.changed(); }
  }
  /** CO-49: *Retry* asks the failed question again. */
  retry(): Promise<void> {
    const failed = this.pending; if (!failed?.error) return Promise.resolve();
    this.pending = null; this.phase = 'idle'; return this.ask(failed.question, failed.selection);
  }
  /** CO-44: closing cancels a running call and forgets the conversation. */
  close(): void { if (this.abort) trace.action('amber', 'Cancel generation', { reason: 'chat closed' }); this.abort?.abort(); this.abort = null; this.turns = []; this.pending = null; this.phase = 'idle'; this.changed(); }
}
