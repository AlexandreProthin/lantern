import { invoke, Channel } from './ipc';
import type { Effort, Usage } from '../core/model';
import type { WireEndpoint } from './endpoints';
export type ErrorKind = 'not-installed' | 'not-logged-in' | 'usage-limit' | 'model-unknown' | 'network' | 'process-crashed' | 'protocol' | 'cancelled'
  /** CE-40: endpoints only. */
  | 'unreachable' | 'key-rejected' | 'context-too-long';
/** IP-6: tool uses per tool name, absent when the call used none. */
export type ToolCalls = Record<string, number>;
export interface Completion { text: string; model: string; usage: Usage; durationMs: number; costUsd?: number; toolCalls?: ToolCalls; outcome: 'ok' | 'cancelled' | 'error'; resolvedEffort?: Effort;
  /** CE-50: the server reported no usage; the figures are Lantern's estimate. */
  usageEstimated?: boolean;
  /** CE-27: the name the server answered with, when it differs from the model asked for (endpoints only). */
  servedModel?: string }
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
/** IP-71: the browser build's fakes hold their first words `ms` longer (`?wait=`), so a test can watch the wait itself. */
export class HeldProvider implements InferenceProvider {
  constructor(private inner: InferenceProvider, private ms: number) {}
  async stream(request: Request, onText: (chunk: string) => void, onTool?: (tool: ToolUse) => void): Promise<Completion> {
    if (this.ms > 0) await new Promise<void>((resolve, reject) => {
      const done = () => { clearTimeout(timer); request.cancel.removeEventListener('abort', abort); };
      const abort = () => { done(); reject(new ProviderError('cancelled', '')); };
      const timer = setTimeout(() => { done(); resolve(); }, this.ms);
      if (request.cancel.aborted) abort(); else request.cancel.addEventListener('abort', abort, { once: true });
    });
    return this.inner.stream(request, onText, onTool);
  }
}
/** CE-11: how an endpoint call reaches Rust (or the fake, IP-71); CE-58: a Codex call too, with its bare model (none for Codex's default). */
export interface EndpointTransport { streamEndpoint(request: Request, endpoint: WireEndpoint, onText: (chunk: string) => void): Promise<Completion>;
  streamCodex(request: Request, onText: (chunk: string) => void, onTool?: (tool: ToolUse) => void): Promise<Completion> }
export class DesktopProvider implements InferenceProvider, EndpointTransport {
  stream(request: Request, onText: (chunk: string) => void, onTool?: (tool: ToolUse) => void): Promise<Completion> { return this.call(request, null, onText, onTool); }
  streamEndpoint(request: Request, endpoint: WireEndpoint, onText: (chunk: string) => void): Promise<Completion> { return this.call(request, endpoint, onText); }
  streamCodex(request: Request, onText: (chunk: string) => void, onTool?: (tool: ToolUse) => void): Promise<Completion> { return this.call(request, null, onText, onTool, 'codex'); }
  /** A Claude Code call sends exactly the arguments it always did; an endpoint call adds `endpoint`, a Codex call `cli` (CE-2). */
  private async call(request: Request, endpoint: WireEndpoint | null, onText: (chunk: string) => void, onTool?: (tool: ToolUse) => void, cli?: 'codex'): Promise<Completion> {
    if (request.cancel.aborted) throw new ProviderError('cancelled', '');
    const channel = new Channel<{ requestId: string; text?: string; tool?: ToolUse }>();
    channel.onmessage = event => {
      if (event.requestId !== request.requestId) return;
      if (event.tool) onTool?.(event.tool); else if (event.text !== undefined) onText(event.text);
    };
    const cancel = () => { invoke('cancel_generation', { requestId: request.requestId }).catch(() => {}); };
    request.cancel.addEventListener('abort', cancel, { once: true });
    try {
      const args = { request: { requestId: request.requestId, system: request.system, prompt: request.prompt, model: request.model ?? null, effort: request.effort ?? null, web: request.web ?? false }, channel };
      return await invoke<Completion>('generate', endpoint ? { ...args, endpoint } : cli ? { ...args, cli } : args);
    } catch (e) {
      const error = e as { kind?: ErrorKind; details?: string; model?: string; usage?: Usage; durationMs?: number; toolCalls?: ToolCalls };
      throw new ProviderError(error.kind ?? 'process-crashed', error.details ?? String(e), error.model, error.usage, error.durationMs, error.toolCalls);
    } finally { request.cancel.removeEventListener('abort', cancel); }
  }
}
