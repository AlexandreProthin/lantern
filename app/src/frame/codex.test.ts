import { expect, test, vi } from 'vitest';
const bridge = vi.hoisted(() => ({ calls: [] as [string, any][] }));
vi.mock('./ipc', () => ({
  invoke: (command: string, args: any) => { bridge.calls.push([command, args]); return Promise.resolve({ text: 'ok', model: args.request?.model ?? 'default', usage: {}, durationMs: 0, outcome: 'ok' }); },
  Channel: class { onmessage: (event: unknown) => void = () => {}; },
}));
import { displayModel, isCodexModel, isEndpointModel } from '../core/models';
import { endpointsOf, type EndpointConfig } from './endpoints';
import { FakeEndpointTransport } from './fake-endpoint';
import { DesktopProvider, ProviderError, type Request } from './provider';
import { RoutingProvider, route } from './routing';
import { isLocalModel } from './token-split';
import { validateSettings, defaultSettings } from './settings';
import { errorMessage } from '../ui/error-message';
import { endpointGroups, endpointNameOf } from '../ui/model-choices.svelte';
import { strings } from '../ui/strings';
import { FakeProvider } from '../rooms/learn/fake-provider';

const ollama: EndpointConfig = { id: 'ollama', name: 'Ollama', preset: 'ollama', baseUrl: 'http://localhost:11434/v1', lanConfirmed: false, models: [{ id: 'gemma4:e2b', pinned: true, thinking: 'off' }] };
const req = (model?: string, web?: boolean): Request => ({ requestId: 'r', system: 's', prompt: 'p', model, effort: 'medium', ...(web === undefined ? {} : { web }), cancel: new AbortController().signal });

test('CE-58: a Codex model goes bare to Codex, web calls included; codex:default lets Codex choose', () => {
  const r = route(req('codex:gpt-6-luna'), [ollama], 'opus');
  expect(r.kind === 'codex' && r.request.model).toBe('gpt-6-luna');
  const d = route(req('codex:default'), [ollama], 'opus');
  expect(d.kind === 'codex' && 'model' in d.request).toBe(false);
  const w = route(req('codex:gpt-6.1-sol', true), [], 'opus');
  expect(w.kind === 'codex' && [w.request.model, w.request.web]).toEqual(['gpt-6.1-sol', true]);
  expect(route(req('opus'), [], 'opus').kind).toBe('claude');
});
test('CE-2, CE-58: a Codex call adds only cli: codex; a Claude Code call is unchanged', async () => {
  const desktop = new DesktopProvider(); bridge.calls = [];
  await desktop.stream(req('opus'), () => {});
  await desktop.streamCodex({ ...req('gpt-6-luna') }, () => {});
  expect(Object.keys(bridge.calls[0][1]).sort()).toEqual(['channel', 'request']);
  expect(bridge.calls[1][1].cli).toBe('codex'); expect(bridge.calls[1][1].endpoint).toBeUndefined(); expect(bridge.calls[1][1].request.model).toBe('gpt-6-luna');
});
test('CE-58: results and failures keep the model as picked and report to Codex, never to Claude Code', async () => {
  const reports: [string, unknown][] = []; let claude = 0;
  const transport = new FakeEndpointTransport(new FakeProvider(0));
  const routing = new RoutingProvider({ stream: async () => { claude++; throw new Error('not Claude'); } }, transport, () => ({ endpoints: [], defaultModel: 'opus' }), (id, h) => reports.push([id, h]));
  const ok = await routing.stream(req('codex:gpt-6-luna'), () => {});
  expect(ok.model).toBe('codex:gpt-6-luna'); expect(reports[0][0]).toBe('codex'); expect(claude).toBe(0);
  transport.options = { codexError: 'not-logged-in' };
  const err = await routing.stream(req('codex:default'), () => {}).catch(e => e);
  expect(err).toBeInstanceOf(ProviderError); expect([err.kind, err.model]).toEqual(['not-logged-in', 'codex:default']); expect(reports[1][0]).toBe('codex');
});
test('CE-58: names, picker group, errors and tokens', () => {
  expect(displayModel('codex:gpt-6.1-sol')).toBe('Codex · GPT-6.1 Sol'); expect(displayModel('codex:gpt-7')).toBe('Codex · gpt-7');
  expect(isCodexModel('codex:default') && isEndpointModel('codex:default')).toBe(true); expect(isCodexModel('ollama:x')).toBe(false);
  expect(endpointGroups([ollama], false).map(g => g.id)).toEqual(['ollama']);
  expect(endpointGroups([ollama], true).map(g => g.id)).toEqual(['codex', 'ollama']);
  expect(endpointNameOf('codex:gpt-6-luna')).toBeNull();
  expect(errorMessage({ kind: 'not-installed', model: 'codex:default' })).toBe(strings.codex.errors['not-installed']);
  expect(errorMessage({ kind: 'model-unknown', model: 'codex:gpt-9' })).toBe(strings.codex.modelUnknown('gpt-9'));
  expect(errorMessage({ kind: 'not-installed', model: 'opus' })).toBe(strings.errorKinds['not-installed']);
  expect(isLocalModel('codex:gpt-6-luna')).toBe(false);
});
test('CE-58: provider.codex is a boolean or absent, Reset keeps it, and no endpoint can take the codex prefix', () => {
  const defaults = defaultSettings();
  expect(validateSettings({ provider: { codex: true } }, defaults).provider.codex).toBe(true);
  expect('codex' in validateSettings({ provider: { codex: 'yes' } }, defaults).provider).toBe(false);
  expect('codex' in defaults.provider).toBe(false);
  expect(endpointsOf({ endpoints: [{ ...ollama, id: 'codex' }, ollama] }).map(e => e.id)).toEqual(['ollama']);
});
