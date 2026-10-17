import { afterEach, expect, test } from 'vitest';
import { errorMessage } from './error-message';
import { modelChoices } from './model-choices.svelte';
import { strings } from './strings';
import type { ErrorKind } from '../frame/provider';

const kinds = Object.keys(strings.errorKinds) as ErrorKind[];
afterEach(() => { modelChoices.endpoints = []; });

test('SE-45, CE-2: a Claude Code failure reads exactly as before, whatever endpoints exist', () => {
  modelChoices.endpoints = [{ id: 'ollama', name: 'Ollama', preset: 'ollama', baseUrl: 'http://localhost:11434/v1', lanConfirmed: false, models: [] }];
  for (const kind of kinds) for (const model of ['', 'opus', 'claude-opus-5-5']) expect(errorMessage({ kind, model })).toBe(strings.errorKinds[kind]);
});
test('CE-40: an endpoint failure names its server and says what to do', () => {
  modelChoices.endpoints = [{ id: 'ollama', name: 'Ollama', preset: 'ollama', baseUrl: 'http://localhost:11434/v1', lanConfirmed: false, models: [] },
    { id: 'box', name: 'GPU box', preset: 'llamacpp', baseUrl: 'http://192.168.1.20:8080/v1', lanConfirmed: true, models: [] }];
  const at = (kind: ErrorKind, model = 'ollama:gemma4:e2b') => errorMessage({ kind, model });
  expect(at('unreachable')).toBe('Ollama is not answering at localhost:11434. Start it, then try again.');
  expect(at('unreachable', 'box:qwen')).toBe('GPU box is not answering at 192.168.1.20:8080. Start it, then try again.');
  expect(at('model-unknown')).toBe('gemma4:e2b is not on Ollama. Run “ollama pull gemma4:e2b”, then try again.');
  expect(at('model-unknown', 'box:qwen')).toContain('GPU box has no model “qwen”');
  expect(at('context-too-long')).toContain('Raise the size in Settings → Provider → Endpoints');
  expect(at('usage-limit')).toContain('Ollama is limiting requests');
  for (const kind of ['network', 'process-crashed', 'protocol'] as const) { expect(at(kind)).toContain('Ollama'); expect(at(kind)).not.toContain('Claude'); }
  expect(at('model-unknown', 'gone:model')).toContain('No endpoint “gone” is set up');
  expect(at('cancelled')).toBe('');
  expect(errorMessage({ kind: 'protocol', model: 'ollama:gemma4:e2b', details: 'Lantern sends http:// only to this machine or a confirmed LAN address, not to 192.168.1.20; use https://' })).toBe(strings.lanHint);
});
test('CE-55: a research call with no Claude Code says research needs it', () => {
  expect(errorMessage({ kind: 'not-installed', model: '' }, { web: true })).toBe(strings.researchNeedsClaude);
  expect(errorMessage({ kind: 'not-installed', model: '' })).toBe(strings.errorKinds['not-installed']);
});
