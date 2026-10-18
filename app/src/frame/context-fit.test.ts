import { expect, test } from 'vitest';
import { newLearnSubject } from '../rooms/learn/rules';
import { taskPrompt } from '../rooms/learn/prompts';
import type { GraphNode } from '../core/model';
import { estimateTokens, fitPrompt, promptFits, replyRoom } from './context-fit';
import { RoutingProvider } from './routing';
import { FakeEndpointTransport } from './fake-endpoint';
import { FakeProvider } from '../rooms/learn/fake-provider';
import type { EndpointConfig } from './endpoints';

/** A Learn subject of `count` lit nodes with long hooks, focused deep in the tree (as the CA-52 tests build it). */
function big(count: number) {
  const s = newLearnSubject('Tides'), v = s.rooms.learn, root = v.nodes[v.rootId], nodes: Record<string, GraphNode> = {};
  for (let i = 0; i < count; i++) nodes[`n${i}`] = { ...structuredClone(root), id: `n${i}`, title: `Node ${i}`, hook: `Hook ${i} ${'about the Moon and the oceans '.repeat(6)}`,
    parents: i ? [i < 4 ? `n${i - 1}` : 'n0'] : [], state: 'lit', createdAt: '2026-10-02T00:00:00Z' };
  v.nodes = nodes; v.rootId = 'n0'; v.focusId = 'n3'; return v;
}
const size = (p: { system: string; prompt: string }) => estimateTokens(p.system) + estimateTokens(p.prompt);

test('CE-31: with no context size (every Claude Code model) the prompt is built exactly as before', () => {
  const v = big(300); const plain = taskPrompt(v, 'light', 'n3', { budgetTokens: 12_000 });
  expect(fitPrompt(b => taskPrompt(v, 'light', 'n3', { budgetTokens: b }), 12_000, undefined)).toEqual(plain);
});
test('CE-31: on a small context size the map shrinks through the reduced form until the prompt fits, keeping every node', () => {
  const v = big(300); const budgets: number[] = [];
  const full = taskPrompt(v, 'light', 'n3', { budgetTokens: 12_000 }); expect(size(full)).toBeGreaterThan(8192 - replyRoom(8192));
  const fitted = fitPrompt(b => { budgets.push(b); return taskPrompt(v, 'light', 'n3', { budgetTokens: b }); }, 12_000, 8192);
  expect(promptFits(fitted.system, fitted.prompt, 8192).fits).toBe(true); expect(budgets[0]).toBe(12_000); expect(budgets.at(-1)!).toBeLessThan(12_000);
  for (const id of ['n0', 'n150', 'n299']) expect(fitted.prompt).toContain(id);
  // A large window changes nothing.
  expect(fitPrompt(b => taskPrompt(v, 'light', 'n3', { budgetTokens: b }), 12_000, 131072)).toEqual(full);
});
test('CE-33: a prompt that cannot fit is refused before it is sent, with how to raise the size', async () => {
  const v = big(300); const tiny = fitPrompt(b => taskPrompt(v, 'light', 'n3', { budgetTokens: b }), 12_000, 2048);
  expect(promptFits(tiny.system, tiny.prompt, 2048).fits).toBe(false);
  const ollama: EndpointConfig = { id: 'ollama', name: 'Ollama', preset: 'ollama', baseUrl: 'http://localhost:11434/v1', lanConfirmed: false, models: [{ id: 'gemma4:e2b', pinned: true, thinking: 'off', contextSize: 2048 }] };
  let sent = 0; const transport = new FakeEndpointTransport(new FakeProvider(0)); const real = transport.streamEndpoint.bind(transport);
  transport.streamEndpoint = (...args) => { sent++; return real(...args); };
  const routing = new RoutingProvider({ stream: async () => { throw new Error('not Claude'); } }, transport, () => ({ endpoints: [ollama], defaultModel: 'opus' }));
  await expect(routing.stream({ requestId: 'r', ...tiny, model: 'ollama:gemma4:e2b', cancel: new AbortController().signal }, () => {}))
    .rejects.toMatchObject({ kind: 'context-too-long', details: expect.stringContaining('Raise its context size') });
  expect(sent).toBe(0);
  await routing.stream({ requestId: 'r', system: 's', prompt: 'short', model: 'ollama:gemma4:e2b', cancel: new AbortController().signal }, () => {}); expect(sent).toBe(1);
});
