import { expect, test } from 'vitest';
import { inOutText, splitLog, splitModels, splitSummary, totalText } from './token-split';
import { totalsOf } from './amber/log';
import { visitSummary } from '../core/model';
import { newLearnSubject } from '../rooms/learn/rules';
import { learnRoom } from '../rooms/learn/definition';
import { modelChoices } from '../ui/model-choices.svelte';
import type { EndpointConfig } from './endpoints';

const g = (model: string, input: number, output: number) => ({ model, usage: { input, output, thinking: 0, cacheRead: 0, cacheWrite: 0 } });

test('CE-53: with Claude only there is no split, and every figure reads as before', () => {
  expect(splitLog([g('claude-opus-5-5', 900, 300)])).toBeNull();
  expect(inOutText(48_300, 21_000, null)).toBe('48.3k in / 21.0k out'); expect(totalText(69_300, null)).toBe('69.3k');
  const s = newLearnSubject('Tides'); s.rooms.learn.log.push(g('claude-opus-5-5', 48_300, 21_000) as never);
  expect(learnRoom.statsSummary(s).tooltip).toBe('48300 in / 21000 out');
});
test('CE-53: once a local token is spent, Claude and local are shown apart, everywhere', () => {
  const log = [g('claude-opus-5-5', 40_100, 20_200), g('ollama:gemma4:e2b', 911, 188), g('ollama:gemma4:e2b', 471, 401)];
  const split = splitLog(log)!;
  expect(split).toEqual({ claude: { input: 40_100, output: 20_200 }, local: { input: 1382, output: 589 } });
  expect(inOutText(41_482, 20_789, split)).toBe('Claude 40.1k in / 20.2k out · local 1.4k in / 589 out');
  expect(totalText(62_271, split)).toBe('Claude 60.3k · local 2.0k');
  const s = newLearnSubject('Tides'); s.rooms.learn.log.push(...log as never[]);
  expect(learnRoom.statsSummary(s).tooltip).toBe('Claude 40.1k in / 20.2k out · local 1.4k in / 589 out');
  // The summary the Gallery reads (ST-7) carries the same split.
  expect(splitSummary(visitSummary(s.rooms.learn))).toEqual(split);
  expect(splitSummary({ modelOutputs: { 'claude-opus-5-5': 10 } })).toBeNull();
});
test('CE-53, CO-47: Amber’s totals keep a per-model split when records name their model', () => {
  const t = totalsOf([{ model: 'claude-haiku-5-5', usage: { input: 100, output: 20 } }, { model: 'ollama:gemma4:e2b', usage: { input: 2305, output: 44 } }, { usage: { input: 1, output: 1 } }]);
  expect(t).toMatchObject({ input: 2406, output: 65, calls: 3 });
  expect(splitModels(t.models)).toEqual({ claude: { input: 100, output: 20 }, local: { input: 2305, output: 44 } });
  expect(splitModels(undefined)).toBeNull();
});
test('CE-53, cloud slice 4: cloud endpoint tokens count with Claude; local endpoints and Claude-only figures are unchanged', () => {
  const ep = (id: string, preset: EndpointConfig['preset'], baseUrl: string): EndpointConfig => ({ id, name: id, preset, baseUrl, lanConfirmed: false, models: [] });
  modelChoices.endpoints = [ep('ollama', 'ollama', 'http://localhost:11434/v1'), ep('nvidia', 'nvidia', 'https://integrate.api.nvidia.com/v1'),
    ep('box', 'custom', 'http://192.168.1.20:8080/v1'), ep('api', 'custom', 'https://api.example.com/v1')];
  const log = [g('claude-opus-5-5', 40_100, 20_200), g('ollama:gemma4:e2b', 911, 188), g('nvidia:nvidia/nemotron-3.5-super-vl-120b-a12b', 95, 1006),
    g('box:qwen3:8b', 100, 10), g('api:some/model', 5, 5)];
  expect(splitLog(log)).toEqual({ claude: { input: 40_200, output: 21_211 }, local: { input: 1011, output: 198 } });
  // Cloud only: no local token, so the figures read as with Claude alone.
  expect(splitLog([g('claude-opus-5-5', 900, 300), g('nvidia:m', 95, 1006)])).toBeNull();
  expect(splitLog([g('claude-opus-5-5', 900, 300)])).toBeNull();
  // An endpoint no longer set up: local, unless its id is NVIDIA's own.
  modelChoices.endpoints = [];
  expect(splitLog([g('ollama:gemma4:e2b', 10, 1), g('nvidia-2:m', 20, 2)])).toEqual({ claude: { input: 20, output: 2 }, local: { input: 10, output: 1 } });
});
