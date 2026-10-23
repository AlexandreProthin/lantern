import { beforeEach, expect, test, vi } from 'vitest';
// A plain stub: with vi.fn, a thrown plain object failed the test in vitest 3.2.
const bridge = vi.hoisted(() => ({ calls: [] as [string, any][], impl: async (): Promise<unknown> => undefined, channel: undefined as undefined | { onmessage: (event: unknown) => void } }));
vi.mock('./ipc', () => ({
  invoke: (command: string, args: any) => { bridge.calls.push([command, args]); return bridge.impl(); },
  Channel: class { onmessage: (event: unknown) => void = () => {}; constructor() { bridge.channel = this; } },
}));
import { DesktopProvider, ProviderError, type ToolUse } from './provider';
const request = (web?: boolean) => ({ requestId: 'r1', system: 's', prompt: 'p', ...(web === undefined ? {} : { web }), cancel: new AbortController().signal });
const ok = { text: '', model: 'm', usage: {}, durationMs: 0, outcome: 'ok' };
beforeEach(() => { bridge.calls = []; bridge.impl = async () => ok; });

test('IP-1: a call asks for the web only when it says so', async () => {
  await new DesktopProvider().stream(request(), () => {});
  await new DesktopProvider().stream(request(true), () => {});
  expect(bridge.calls.map(([, args]) => args.request.web)).toEqual([false, true]);
});

test('IP-13: tool uses go to onTool, text to onText, other requests are ignored', async () => {
  const texts: string[] = [], tools: ToolUse[] = [];
  bridge.impl = async () => {
    const send = bridge.channel!.onmessage;
    send({ requestId: 'r1', text: 'Let me look.' }); send({ requestId: 'r1', tool: { name: 'WebSearch', detail: 'a1 mini' } });
    send({ requestId: 'other', text: 'stray' }); send({ requestId: 'r1', text: 'Answer.' });
    return { ...ok, text: 'Answer.', toolCalls: { WebSearch: 1 } };
  };
  const result = await new DesktopProvider().stream(request(true), t => texts.push(t), t => tools.push(t));
  expect(texts).toEqual(['Let me look.', 'Answer.']); expect(tools).toEqual([{ name: 'WebSearch', detail: 'a1 mini' }]);
  expect(result.toolCalls).toEqual({ WebSearch: 1 });
});

test('IP-7: a failed web call keeps its tool counts for the log', async () => {
  bridge.impl = async () => { throw { kind: 'network', details: 'offline', model: 'm', durationMs: 5, toolCalls: { WebFetch: 2 } }; };
  const error = await new DesktopProvider().stream(request(true), () => {}).catch(e => e);
  expect(error).toBeInstanceOf(ProviderError); expect(error.kind).toBe('network'); expect(error.toolCalls).toEqual({ WebFetch: 2 });
});
