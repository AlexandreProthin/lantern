import { expect, test } from 'vitest';
import { defaultSettings, validateSettings } from './settings';
import { endpointsOf, mergeModels, needsLanConfirmation, newEndpoint, type EndpointConfig } from './endpoints';

const ollama: EndpointConfig = { id: 'ollama', name: 'Ollama', preset: 'ollama', baseUrl: 'http://localhost:11434/v1', lanConfirmed: false,
  models: [{ id: 'gemma4:e2b', pinned: true, contextSize: 32768, thinking: 'on' }] };

test('CE-20, SE-6, SE-7: provider.endpoints round-trips, bad entries drop, and the defaults hold none (so Reset keeps them)', () => {
  const defaults = defaultSettings('C:\\Library', 'Alex');
  expect('endpoints' in defaults.provider).toBe(false);
  expect(validateSettings({}, defaults).provider.endpoints).toBeUndefined();
  const stored = validateSettings({ provider: { defaultModel: 'ollama:gemma4:e2b', endpoints: [ollama, { ...ollama }, { id: 'x', preset: 'ollama', baseUrl: 'http://localhost/v1', apiKey: 'sk-secret' }, null] } }, defaults);
  expect(stored.provider.defaultModel).toBe('ollama:gemma4:e2b');
  expect(stored.provider.endpoints).toEqual([ollama, { id: 'x', name: 'x', preset: 'ollama', baseUrl: 'http://localhost/v1', lanConfirmed: false, models: [] }]);
  expect(JSON.stringify(stored)).not.toContain('sk-secret');
  const reset = { ...stored.provider, ...defaults.provider }; expect(reset.endpoints).toEqual(stored.provider.endpoints);
  expect(validateSettings({ provider: { endpoints: 'nope' } }, defaults).provider.endpoints).toEqual([]);
  expect(validateSettings({ provider: { defaultModel: 'nvidia:google/gemma-4' } }, defaults).provider.defaultModel).toBe('nvidia:google/gemma-4');
});
test('CE-12: a preset fills in its URL and takes a free id', () => {
  const first = newEndpoint('ollama', [], 'Ollama'); expect(first).toEqual({ id: 'ollama', name: 'Ollama', preset: 'ollama', baseUrl: 'http://localhost:11434/v1', lanConfirmed: false, models: [] });
  expect(newEndpoint('ollama', [first], 'Ollama')).toMatchObject({ id: 'ollama-2', name: 'Ollama 2' });
  expect(newEndpoint('llamacpp', [], 'llama.cpp').baseUrl).toBe('http://localhost:8080/v1'); expect(newEndpoint('custom', [], 'Custom URL').baseUrl).toBe('');
  expect(endpointsOf({ endpoints: [first, newEndpoint('ollama', [first], 'Ollama')] }).map(e => e.id)).toEqual(['ollama', 'ollama-2']);
});
test('CE-21: fetching keeps each model’s settings, adds new ones pinned when the list is short, and forgets unpinned models that left', () => {
  const merged = mergeModels([...ollama.models, { id: 'old', pinned: false, thinking: 'off' }, { id: 'kept', pinned: true, thinking: 'off' }], ['gemma4:e2b', 'qwen3:8b']);
  expect(merged).toEqual([ollama.models[0], { id: 'kept', pinned: true, thinking: 'off' }, { id: 'qwen3:8b', pinned: true, thinking: 'off' }]);
  const long = mergeModels([], Array.from({ length: 120 }, (_, i) => `m${i}`)); expect(long.every(m => !m.pinned)).toBe(true);
});
test('CE-80: plain http to another machine asks for the LAN confirmation', () => {
  for (const url of ['http://localhost:11434/v1', 'http://127.0.0.1:8080/v1', 'http://[::1]:1234/v1', 'https://gpu.example.com/v1', 'not a url']) expect(needsLanConfirmation(url), url).toBe(false);
  for (const url of ['http://192.168.1.20:11434/v1', 'http://gpu-box:11434']) expect(needsLanConfirmation(url), url).toBe(true);
});
