import { expect, test } from 'vitest';
import { fakeKeyAdmin } from './endpoint-keys';
import { isCloudEndpoint, keyHost, newEndpoint } from './endpoints';
import { defaultSettings, validateSettings } from './settings';
import { errorMessage } from '../ui/error-message';
import { modelChoices } from '../ui/model-choices.svelte';

/** A planted fake key, never a real one. */
const FAKE = 'nvapi-FAKE-planted-0123456789abcdef';

test('CE-70, SE-7: settings.json never holds a key, whatever field it was typed into', () => {
  const defaults = defaultSettings('C:\\Library', 'Alex'), nv = newEndpoint('nvidia', [], 'NVIDIA');
  const typed = { provider: { defaultModel: 'opus', endpoints: [{ ...nv, apiKey: FAKE, key: FAKE, authorization: `Bearer ${FAKE}`, headers: { Authorization: FAKE },
    models: [{ id: 'nvidia/nemotron', pinned: true, thinking: 'default', key: FAKE }] }] } };
  const stored = validateSettings(typed, defaults);
  expect(JSON.stringify(stored)).not.toContain(FAKE); expect(JSON.stringify(stored)).not.toContain('nvapi-');
  expect(stored.provider.endpoints![0]).toEqual({ ...nv, models: [{ id: 'nvidia/nemotron', pinned: true, thinking: 'default' }] });
});
test('CE-71: the fake key admin, like Rust, refuses http and keeps only the status, never the key', async () => {
  const keys = fakeKeyAdmin();
  await expect(keys.set('custom', 'http://example.com/v1', FAKE)).rejects.toContain('https://');
  await expect(keys.set('custom', 'https://example.com/v1', 'has space')).rejects.toContain('API key');
  expect(await keys.status('custom')).toEqual({ set: false });
  const s = await keys.set('nvidia', 'https://integrate.api.nvidia.com/v1', `  ${FAKE}\n`);
  expect(s).toEqual({ set: true, last4: 'cdef', host: 'integrate.api.nvidia.com' }); expect(JSON.stringify(await keys.status('nvidia'))).not.toContain(FAKE);
  expect((await keys.set('short', 'https://example.com:8443/v1', 'abc')).host).toBe('example.com:8443');
  await keys.remove('nvidia'); expect(await keys.status('nvidia')).toEqual({ set: false });
});
test('CE-53, CE-81: what counts as cloud: NVIDIA, and any address that is neither this machine nor the local network', () => {
  const at = (baseUrl: string, preset: 'custom' | 'ollama' | 'nvidia' = 'custom') => isCloudEndpoint({ preset, baseUrl });
  for (const url of ['https://api.example.com/v1', 'https://8.8.8.8/v1', 'http://example.com/v1']) expect(at(url), url).toBe(true);
  for (const url of ['', 'not a url', 'http://localhost:11434/v1', 'http://127.0.0.1:8080/v1', 'http://[::1]:1234/v1', 'https://192.168.1.20/v1', 'http://10.0.0.5/v1',
    'http://172.20.1.1/v1', 'http://gpu-box:11434', 'http://gpu.local/v1', 'http://[fd00::5]/v1']) expect(at(url), url).toBe(false);
  expect(at('', 'nvidia')).toBe(true); expect(at('https://api.example.com/v1', 'ollama')).toBe(true);
  expect(keyHost('https://Integrate.API.nvidia.com/v1')).toBe('integrate.api.nvidia.com'); expect(keyHost('https://example.com:443/v1')).toBe('example.com');
});
test('CE-40, CE-72: a key refused before sending says what to do', () => {
  modelChoices.endpoints = [{ ...newEndpoint('nvidia', [], 'NVIDIA'), models: [] }];
  const at = (details: string) => errorMessage({ kind: 'key-rejected', model: 'nvidia:m', details });
  expect(at('This endpoint needs an API key, and none is saved')).toBe('NVIDIA needs an API key. Add it in Settings → Provider → Endpoints.');
  expect(at('This endpoint\'s key was saved for a.example, not b.example; Lantern does not send it to another address.')).toContain('saved for another address');
  expect(at('HTTP 403: {"detail":"Authorization failed"}')).toBe('NVIDIA rejected the API key. Replace it in Settings → Provider → Endpoints.');
  modelChoices.endpoints = [];
});
