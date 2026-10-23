import { expect, test, vi } from 'vitest';
const bridge = vi.hoisted(() => ({ calls: [] as [string, any][] }));
vi.mock('./ipc', () => ({
  invoke: (command: string, args: any) => { bridge.calls.push([command, args]); return Promise.resolve({ text: 'ok', model: 'ollama:gemma4:e2b', usage: {}, durationMs: 0, outcome: 'ok' }); },
  Channel: class { onmessage: (event: unknown) => void = () => {}; },
}));
import { displayModel, isValidModel, parseModelId } from '../core/models';
import { endpointsOf, wireEndpoint, type EndpointConfig } from './endpoints';
import { FakeEndpointTransport } from './fake-endpoint';
import { DesktopProvider, ProviderError, zeroUsage, type Completion, type InferenceProvider, type Request } from './provider';
import { RoutingProvider, route } from './routing';
import { FakeProvider } from '../rooms/learn/fake-provider';

const ollama: EndpointConfig = { id: 'ollama', name: 'Ollama', preset: 'ollama', baseUrl: 'http://localhost:11434/v1', lanConfirmed: false,
  models: [{ id: 'gemma4:e2b', pinned: true, contextSize: 32768, thinking: 'off' }] };
const req = (model?: string, web?: boolean): Request => ({ requestId: 'r', system: 's', prompt: 'p', model, effort: 'medium', ...(web === undefined ? {} : { web }), cancel: new AbortController().signal });

test('CE-23: an endpoint model splits at the first colon; a Claude Code id has none', () => {
  expect(parseModelId('ollama:gemma4:e2b')).toEqual({ endpointId: 'ollama', model: 'gemma4:e2b' });
  expect(parseModelId('claude-opus-5-5')).toEqual({ endpointId: null, model: 'claude-opus-5-5' });
  expect(displayModel('ollama:gemma4:e2b', { ollama: 'Ollama' })).toBe('Ollama · gemma4:e2b');
  expect(displayModel('claude-opus-5-5', { ollama: 'Ollama' })).toBe('Opus 5.5');
  expect(isValidModel('nvidia:google/gemma-4-31b-it')).toBe(true); expect(isValidModel('bad model')).toBe(false);
});
test('CE-23, CE-55: Claude models pass unchanged; endpoint models go bare to their endpoint; web calls never do', () => {
  const claude = req('opus'); const r = route(claude, [ollama], 'opus');
  expect(r).toEqual({ kind: 'claude', request: claude }); expect(r.kind === 'claude' && r.request).toBe(claude);
  expect(route(req(undefined), [ollama], 'opus').kind).toBe('claude');
  const e = route(req('ollama:gemma4:e2b'), [ollama], 'opus');
  expect(e.kind === 'endpoint' && [e.request.model, e.endpoint]).toEqual(['gemma4:e2b', { id: 'ollama', preset: 'ollama', baseUrl: 'http://localhost:11434/v1', thinking: 'off', lanConfirmed: false, contextSize: 32768 }]);
  const web = (model: string, fallback: string) => { const w = route(req(model, true), [ollama], fallback); return w.kind === 'claude' ? w.request.model : w.kind; };
  expect(web('ollama:gemma4:e2b', 'sonnet')).toBe('sonnet'); expect(web('ollama:gemma4:e2b', 'ollama:gemma4:e2b')).toBe('opus'); expect(web('claude-opus-5-5', 'sonnet')).toBe('claude-opus-5-5');
  expect(route(req('lmstudio:qwen'), [ollama], 'opus')).toEqual({ kind: 'missing', endpointId: 'lmstudio' });
});
test('CE-2: a Claude Code call sends exactly the arguments it always did; an endpoint call adds the endpoint', async () => {
  const desktop = new DesktopProvider(); bridge.calls = [];
  await desktop.stream(req('opus'), () => {});
  await desktop.streamEndpoint(req('gemma4:e2b'), wireEndpoint(ollama, 'gemma4:e2b'), () => {});
  expect(Object.keys(bridge.calls[0][1]).sort()).toEqual(['channel', 'request']);
  expect(bridge.calls[1][1].endpoint).toMatchObject({ id: 'ollama', contextSize: 32768, thinking: 'off' });
  expect(bridge.calls[1][1].request.model).toBe('gemma4:e2b');
});
test('SE-42: endpoint results report to their own health, never to the Claude Code provider', async () => {
  const claudeCalls: Request[] = []; const claude: InferenceProvider = { stream: async r => { claudeCalls.push(r); return { text: 'c', model: 'claude-opus-5-5', usage: zeroUsage(), durationMs: 0, outcome: 'ok' }; } };
  const reports: [string, Completion | ProviderError][] = [];
  const failing = new FakeEndpointTransport(new FakeProvider(0), { error: 'unreachable' });
  const routing = new RoutingProvider(claude, failing, () => ({ endpoints: [ollama], defaultModel: 'opus' }), (id, h) => reports.push([id, h]));
  await expect(routing.stream(req('ollama:gemma4:e2b'), () => {})).rejects.toMatchObject({ kind: 'unreachable', model: 'ollama:gemma4:e2b' });
  await expect(routing.stream(req('gone:model'), () => {})).rejects.toMatchObject({ kind: 'model-unknown' });
  await routing.stream(req('opus'), () => {});
  expect(claudeCalls.map(r => r.model)).toEqual(['opus']); expect(reports.map(([id, h]) => [id, (h as ProviderError).kind])).toEqual([['ollama', 'unreachable']]);
});
test('IP-71: the fake endpoint names the endpoint, waits for its first byte, and can leave the options block open or out', async () => {
  const shown: string[] = []; const t0 = performance.now();
  const fakeReq = { ...req('gemma4:e2b'), prompt: 'TASK: light' };
  const r = await new FakeEndpointTransport(new FakeProvider(0), { firstByteMs: 60, reply: 'unclosed' }).streamEndpoint(fakeReq, wireEndpoint(ollama, 'gemma4:e2b'), c => shown.push(c));
  expect(performance.now() - t0).toBeGreaterThanOrEqual(55); expect(r.model).toBe('ollama:gemma4:e2b'); expect(r.resolvedEffort).toBeUndefined();
  expect(r.text).toContain('<options>['); expect(r.text).not.toContain('</options>'); expect(shown.join('')).toBe(r.text);
  const none = await new FakeEndpointTransport(new FakeProvider(0), { reply: 'no-options' }).streamEndpoint(fakeReq, wireEndpoint(ollama, 'gemma4:e2b'), () => {});
  expect(none.text).not.toContain('<options>');
  const abort = new AbortController(); const slow = new FakeEndpointTransport(new FakeProvider(0), { firstByteMs: 5000 }).streamEndpoint({ ...fakeReq, cancel: abort.signal }, wireEndpoint(ollama, 'gemma4:e2b'), () => {});
  abort.abort(); await expect(slow).rejects.toMatchObject({ kind: 'cancelled' });
});
test('provider.endpoints is read leniently: bad entries are skipped and thinking defaults to off', () => {
  const read = endpointsOf({ endpoints: [ollama, { id: 'Bad Id', preset: 'ollama', baseUrl: 'x' }, { id: 'x', preset: 'nope', baseUrl: 'y' }, 'junk',
    { id: 'lan', preset: 'custom', baseUrl: 'http://10.0.0.5/v1', models: [{ id: 'm', pinned: 1, thinking: 'loud', contextSize: -4 }] }] });
  expect(read.map(e => e.id)).toEqual(['ollama', 'lan']);
  expect(read[1]).toMatchObject({ name: 'lan', lanConfirmed: false, models: [{ id: 'm', pinned: false, thinking: 'off' }] }); expect(read[1].models[0].contextSize).toBeUndefined();
  expect(endpointsOf({})).toEqual([]);
});
