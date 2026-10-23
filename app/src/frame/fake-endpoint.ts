import type { WireEndpoint } from './endpoints';
import { type Completion, type EndpointTransport, type ErrorKind, type InferenceProvider, ProviderError, type Request, type ToolUse } from './provider';

/** How the fake endpoint behaves: a slow first byte (CE-41), an injected error, or a reply shaped as small models write it. */
export interface FakeEndpointOptions { firstByteMs?: number; error?: ErrorKind; reply?: 'normal' | 'unclosed' | 'no-options'; models?: number; codexError?: ErrorKind }
/** IP-71: an endpoint in the browser build and the Playwright tests, answered by the room's own fake. */
export class FakeEndpointTransport implements EndpointTransport {
  constructor(private inner: InferenceProvider, public options: FakeEndpointOptions = {}) {}
  async streamEndpoint(request: Request, endpoint: WireEndpoint, onText: (chunk: string) => void): Promise<Completion> {
    const model = `${endpoint.id}:${request.model ?? ''}`, { firstByteMs = 0, error, reply = 'normal' } = this.options;
    await new Promise<void>((resolve, reject) => {
      if (request.cancel.aborted) { reject(new ProviderError('cancelled', '', model)); return; }
      const abort = () => { clearTimeout(timer); reject(new ProviderError('cancelled', '', model)); };
      const timer = setTimeout(() => { request.cancel.removeEventListener('abort', abort); resolve(); }, firstByteMs);
      request.cancel.addEventListener('abort', abort, { once: true });
    });
    if (error) throw new ProviderError(error, `Injected fake-endpoint failure (${endpoint.preset})`, model);
    // Text after the block starts is held back, so the reshaped block is what the caller sees.
    let raw = '', shown = 0;
    const result = await this.inner.stream(request, chunk => { raw += chunk; const cut = raw.indexOf('<options>'); const upTo = cut < 0 ? raw.length : cut; if (upTo > shown) { onText(raw.slice(shown, upTo)); shown = upTo; } });
    const text = reply === 'unclosed' ? result.text.replace('</options>', '') : reply === 'no-options' ? result.text.replace(/<options>[\s\S]*?<\/options>/, '').trimEnd() : result.text;
    if (text.length > shown) onText(text.slice(shown));
    return { ...result, text, model, resolvedEffort: undefined, costUsd: undefined };
  }
  /** CE-58: Codex in the browser build, answered by the room's own fake under the model as picked. */
  async streamCodex(request: Request, onText: (chunk: string) => void, onTool?: (tool: ToolUse) => void): Promise<Completion> {
    const model = `codex:${request.model ?? 'default'}`;
    if (this.options.codexError) throw new ProviderError(this.options.codexError, 'Injected fake Codex failure', model);
    return { ...await this.inner.stream(request, onText, onTool), model, costUsd: undefined };
  }
}
/** Dev URL parameters: `?endpointDelay=1500&endpointError=unreachable&endpointReply=unclosed&endpointModels=120` (a long catalogue, as NVIDIA's). */
export function fakeEndpointOptions(params: URLSearchParams, kinds: Record<string, unknown>): FakeEndpointOptions {
  const error = params.get('endpointError'), reply = params.get('endpointReply'), codexError = params.get('codexError');
  return { firstByteMs: Number(params.get('endpointDelay') ?? 0) || 0, ...(error && Object.hasOwn(kinds, error) ? { error: error as ErrorKind } : {}),
    ...(reply === 'unclosed' || reply === 'no-options' ? { reply } : {}), ...(Number(params.get('endpointModels')) > 2 ? { models: Math.min(500, Number(params.get('endpointModels'))) } : {}),
    ...(codexError && Object.hasOwn(kinds, codexError) ? { codexError: codexError as ErrorKind } : {}) };
}
/** IP-71: the model list and model facts the browser build shows for any endpoint. */
export const fakeEndpointAdmin = {
  async models(options: FakeEndpointOptions): Promise<string[]> { if (options.error) throw new ProviderError(options.error, 'Injected fake-endpoint failure'); return ['gemma4:e2b', 'qwen3:8b', ...Array.from({ length: Math.max(0, (options.models ?? 2) - 2) }, (_, i) => `vendor/model-${i + 1}`)]; },
  async info(): Promise<{ contextSize?: number; thinking?: boolean }> { return { contextSize: 131072, thinking: true }; },
};
