import { invoke, Channel } from '@tauri-apps/api/core';
import type { Effort, Usage } from '../core/model';
export type ErrorKind = 'not-installed' | 'not-logged-in' | 'usage-limit' | 'model-unknown' | 'network' | 'process-crashed' | 'protocol' | 'cancelled';
export interface Completion { text: string; model: string; usage: Usage; durationMs: number; costUsd?: number; outcome: 'ok' | 'cancelled' | 'error'; resolvedEffort?: Effort }
export interface Request { requestId: string; system: string; prompt: string; model?: string; effort?: Effort; cancel: AbortSignal }
export class ProviderError extends Error {
  constructor(public kind: ErrorKind, public details: string, public model = '', public usage: Usage = zeroUsage(), public durationMs = 0) { super(kind); }
}
export const zeroUsage = (): Usage => ({ input: 0, output: 0, thinking: 0, cacheRead: 0, cacheWrite: 0 });
export interface InferenceProvider { stream(request: Request, onText: (chunk: string) => void): Promise<Completion> }
/** SE-42: explicit tests and ordinary calls share session health; cancellation is neutral. */
export class ObservedProvider implements InferenceProvider {
  constructor(private inner: InferenceProvider, private report: (health: Completion | ProviderError) => void) {}
  async stream(request: Request, onText: (chunk: string) => void): Promise<Completion> {
    try { const result=await this.inner.stream(request,onText); this.report(result); return result; }
    catch(error) { if(error instanceof ProviderError && error.kind!=='cancelled') this.report(error); throw error; }
  }
}
export class DesktopProvider implements InferenceProvider {
  async stream(request: Request, onText: (chunk: string) => void): Promise<Completion> {
    if (request.cancel.aborted) throw new ProviderError('cancelled', '');
    const channel = new Channel<{ requestId: string; text: string }>();
    channel.onmessage = event => { if (event.requestId === request.requestId) onText(event.text); };
    const cancel = () => { invoke('cancel_generation', { requestId: request.requestId }).catch(() => {}); };
    request.cancel.addEventListener('abort', cancel, { once: true });
    try {
      return await invoke<Completion>('generate', { request: { requestId: request.requestId, system: request.system, prompt: request.prompt, model: request.model ?? null, effort: request.effort ?? null }, channel });
    } catch (e) {
      const error = e as { kind?: ErrorKind; details?: string; model?: string; usage?: Usage; durationMs?: number };
      throw new ProviderError(error.kind ?? 'process-crashed', error.details ?? String(e), error.model, error.usage, error.durationMs);
    } finally { request.cancel.removeEventListener('abort', cancel); }
  }
}
