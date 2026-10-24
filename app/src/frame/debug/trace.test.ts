import { describe, expect, it } from 'vitest';
import { MAX_ENTRIES, TracedProvider, TraceStore, type CallEntry, type TraceEntry } from './trace.svelte';
import { ProviderError, zeroUsage, type Completion, type InferenceProvider, type Request } from '../provider';

const request = (over: Partial<Request> = {}): Request => ({ requestId: 'r1', system: 'SYS', prompt: 'SUBJECT: tides\n\nTASK: light', model: 'opus', effort: 'low', cancel: new AbortController().signal, ...over });
const ok = (text: string): Completion => ({ text, model: 'claude-opus', usage: zeroUsage(), durationMs: 5, outcome: 'ok' });
const fake = (run: (onText: (c: string) => void, onTool?: (t: { name: string; detail: string }) => void) => Promise<Completion>): InferenceProvider => ({ stream: (_r, onText, onTool) => run(onText, onTool) });
const flush = () => new Promise(r => setTimeout(r, 30));

describe('debug trace', () => {
  it('DC-4: captures nothing while off and passes calls through', async () => {
    const store = new TraceStore(); let seen = '';
    const result = await new TracedProvider(fake(async onText => { onText('hi'); return ok('hi'); }), store).stream(request(), c => seen += c);
    store.action('learn', 'lit a node');
    expect(result.text).toBe('hi'); expect(seen).toBe('hi'); expect(store.entries).toHaveLength(0);
  });
  it('DC-21: records the exact strings, the stream with tools in place, and the result', async () => {
    const store = new TraceStore(); store.setEnabled(true); const done: TraceEntry[] = []; store.onComplete(e => done.push(e));
    const provider = new TracedProvider(fake(async (onText, onTool) => { onText('Searching'); onTool?.({ name: 'WebSearch', detail: 'tides' }); onText('Tides '); onText('rise.'); return ok('Tides rise.'); }), store);
    await provider.stream(request({ web: true, trace: { origin: 'learn·light', layers: [{ name: 'SUBJECT', text: 'SUBJECT: tides' }, { name: 'GHOST', text: 'not in prompt' }] } }), () => {});
    await flush();
    const call = store.entries[0] as CallEntry;
    expect(call).toMatchObject({ kind: 'call', origin: 'learn·light', system: 'SYS', prompt: 'SUBJECT: tides\n\nTASK: light', web: true, status: 'ok', model: 'claude-opus', missingLayers: ['GHOST'] });
    expect(call.stream.map(p => p.kind === 'text' ? p.text : `[${p.name}:${p.detail}]`)).toEqual(['Searching', '[WebSearch:tides]', 'Tides rise.']);
    expect(done).toHaveLength(1);
  });
  it('records errors and cancellations, and rethrows', async () => {
    const store = new TraceStore(); store.setEnabled(true);
    const failing = new TracedProvider(fake(async () => { throw new ProviderError('usage-limit', 'limit hit', 'opus'); }), store);
    await expect(failing.stream(request(), () => {})).rejects.toThrow('usage-limit');
    expect(store.entries[0]).toMatchObject({ status: 'error', error: { kind: 'usage-limit', details: 'limit hit' } });
  });
  it('DC-16: keeps the last entries and counts the dropped ones', () => {
    const store = new TraceStore(); store.setEnabled(true);
    for (let i = 0; i < MAX_ENTRIES + 5; i++) store.event('frame', `e${i}`);
    expect(store.entries).toHaveLength(MAX_ENTRIES); expect(store.dropped).toBe(5); expect((store.entries[0] as { summary: string }).summary).toBe('e5');
  });
  it('DC-2: turning off clears the entries', () => {
    const store = new TraceStore(); store.setEnabled(true); store.warn('frame', 'w'); store.setEnabled(false);
    expect(store.entries).toHaveLength(0);
  });
});
