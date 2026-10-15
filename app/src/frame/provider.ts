import { invoke, Channel } from '@tauri-apps/api/core';
import type { Effort, Usage } from '../core/model';
export type ErrorKind = 'not-installed' | 'not-logged-in' | 'usage-limit' | 'model-unknown' | 'network' | 'process-crashed' | 'protocol' | 'cancelled';
/** IP-6: tool uses per tool name, absent when the call used none. */
export type ToolCalls = Record<string, number>;
export interface Completion { text: string; model: string; usage: Usage; durationMs: number; costUsd?: number; toolCalls?: ToolCalls; outcome: 'ok' | 'cancelled' | 'error'; resolvedEffort?: Effort }
/** IP-1: `web` allows WebSearch and WebFetch only; absent means no tool at all. */
export interface Request { requestId: string; system: string; prompt: string; model?: string; effort?: Effort; web?: boolean; cancel: AbortSignal }
/** IP-13: the search query for WebSearch, the page's host for WebFetch. */
export interface ToolUse { name: string; detail: string }
export class ProviderError extends Error {
  constructor(public kind: ErrorKind, public details: string, public model = '', public usage: Usage = zeroUsage(), public durationMs = 0, public toolCalls?: ToolCalls) { super(kind); }
}
export const zeroUsage = (): Usage => ({ input: 0, output: 0, thinking: 0, cacheRead: 0, cacheWrite: 0 });
/** IP-4, IP-13: a tool use closes the text before it, so a caller showing chunks starts over at `onTool`. */
export interface InferenceProvider { stream(request: Request, onText: (chunk: string) => void, onTool?: (tool: ToolUse) => void): Promise<Completion> }
/** SE-42: explicit tests and ordinary calls share session health; cancellation is neutral. */
export class ObservedProvider implements InferenceProvider {
  constructor(private inner: InferenceProvider, private report: (health: Completion | ProviderError) => void) {}
  async stream(request: Request, onText: (chunk: string) => void, onTool?: (tool: ToolUse) => void): Promise<Completion> {
    try { const result=await this.inner.stream(request,onText,onTool); this.report(result); return result; }
    catch(error) { if(error instanceof ProviderError && error.kind!=='cancelled') this.report(error); throw error; }
  }
}
export class DesktopProvider implements InferenceProvider {
  async stream(request: Request, onText: (chunk: string) => void, onTool?: (tool: ToolUse) => void): Promise<Completion> {
    if (request.cancel.aborted) throw new ProviderError('cancelled', '');
    const channel = new Channel<{ requestId: string; text?: string; tool?: ToolUse }>();
    channel.onmessage = event => {
      if (event.requestId !== request.requestId) return;
      if (event.tool) onTool?.(event.tool); else if (event.text !== undefined) onText(event.text);
    };
    const cancel = () => { invoke('cancel_generation', { requestId: request.requestId }).catch(() => {}); };
    request.cancel.addEventListener('abort', cancel, { once: true });
    try {
      return await invoke<Completion>('generate', { request: { requestId: request.requestId, system: request.system, prompt: request.prompt, model: request.model ?? null, effort: request.effort ?? null, web: request.web ?? false }, channel });
    } catch (e) {
      const error = e as { kind?: ErrorKind; details?: string; model?: string; usage?: Usage; durationMs?: number; toolCalls?: ToolCalls };
      throw new ProviderError(error.kind ?? 'process-crashed', error.details ?? String(e), error.model, error.usage, error.durationMs, error.toolCalls);
    } finally { request.cancel.removeEventListener('abort', cancel); }
  }
}
