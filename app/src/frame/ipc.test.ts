import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { Channel, invoke, pair } from './ipc';

const ndjson = (lines: unknown[]) => new Response(new ReadableStream({
  start(c) { for (const l of lines) c.enqueue(new TextEncoder().encode(JSON.stringify(l) + '\n')); c.close(); },
}), { status: 200 });
/** A page that can be hidden (a phone locked) and shown again. */
const page = Object.assign(new EventTarget(), { visibilityState: 'visible' as DocumentVisibilityState });
const setShown = (v: boolean) => { page.visibilityState = v ? 'visible' : 'hidden'; page.dispatchEvent(new Event('visibilitychange')); };
beforeEach(() => { page.visibilityState = 'visible'; vi.stubGlobal('document', page); });
afterEach(() => vi.unstubAllGlobals());

test('NW-30: a command is a POST to /api/invoke with its arguments', async () => {
  const fetch = vi.fn(async () => new Response(JSON.stringify({ id: 'tcp' }), { status: 200 }));
  vi.stubGlobal('fetch', fetch);
  expect(await invoke('load_subject', { library: 'x', id: 'tcp' })).toEqual({ id: 'tcp' });
  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('/api/invoke/load_subject');
  expect(init.method).toBe('POST'); expect(JSON.parse(init.body as string)).toEqual({ library: 'x', id: 'tcp' });
});

test('NW-30: a refused command throws the server\'s error body', async () => {
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ kind: 'conflict' }), { status: 400 }));
  await expect(invoke('save_subject')).rejects.toEqual({ kind: 'conflict' });
});

test('NW-30: generate feeds chunks to the channel, then returns the result', async () => {
  let body: any;
  vi.stubGlobal('fetch', async (_: string, init: RequestInit) => { body = JSON.parse(init.body as string); return ndjson([{ chunk: { requestId: 'r', text: 'a' } }, { chunk: { requestId: 'r', text: 'b' } }, { result: { text: 'ab' } }]); });
  const channel = new Channel<{ text: string }>(); const seen: string[] = [];
  channel.onmessage = m => seen.push(m.text);
  expect(await invoke('generate', { request: { requestId: 'r' }, channel })).toEqual({ text: 'ab' });
  expect(seen).toEqual(['a', 'b']); expect(body).toEqual({ request: { requestId: 'r' } });
});

test('NW-30: a generation error is thrown as the provider error', async () => {
  vi.stubGlobal('fetch', async () => ndjson([{ error: { kind: 'usage-limit', details: 'x' } }]));
  await expect(invoke('generate', { request: {}, channel: new Channel() })).rejects.toEqual({ kind: 'usage-limit', details: 'x' });
});

test('NW-50: a stream cut before its last line is asked for again from the lines already read', async () => {
  const bodies: any[] = [];
  vi.stubGlobal('fetch', async (_: string, init: RequestInit) => {
    bodies.push(JSON.parse(init.body as string));
    return bodies.length === 1 ? ndjson([{ chunk: { text: 'a' } }, { chunk: { text: 'b' } }]) : ndjson([{ chunk: { text: 'c' } }, { result: { text: 'abc' } }]);
  });
  const channel = new Channel<{ text: string }>(); const seen: string[] = [];
  channel.onmessage = m => seen.push(m.text);
  expect(await invoke('generate', { request: { requestId: 'r' }, channel })).toEqual({ text: 'abc' });
  expect(seen).toEqual(['a', 'b', 'c']);
  expect(bodies).toEqual([{ request: { requestId: 'r' } }, { request: { requestId: 'r' }, from: 2 }]);
});

test('NW-52: back from a locked screen, the page drops a silent connection and reattaches at once', async () => {
  const bodies: any[] = [];
  vi.stubGlobal('fetch', async (_: string, init: RequestInit) => {
    bodies.push(JSON.parse(init.body as string));
    if (bodies.length > 1) return ndjson([{ result: { text: 'a' } }]);
    // One line, then nothing: the connection the lock left behind.
    return new Response(new ReadableStream({ start(c) {
      c.enqueue(new TextEncoder().encode(JSON.stringify({ chunk: { text: 'a' } }) + '\n'));
      init.signal!.addEventListener('abort', () => c.error(new DOMException('aborted', 'AbortError')));
    } }), { status: 200 });
  });
  const result = invoke('generate', { request: { requestId: 'r' }, channel: new Channel() });
  await new Promise(r => setTimeout(r, 10));
  setShown(false); setShown(true);
  const started = Date.now();
  expect(await result).toEqual({ text: 'a' });
  expect(bodies[1]).toEqual({ request: { requestId: 'r' }, from: 1 });
  expect(Date.now() - started).toBeLessThan(500);
});

test('NW-51: a generation the desktop no longer has ends with the server\'s error', async () => {
  let calls = 0;
  vi.stubGlobal('fetch', async () => ++calls === 1 ? ndjson([{ chunk: { text: 'a' } }])
    : new Response(JSON.stringify({ kind: 'network', details: 'gone' }), { status: 410 }));
  await expect(invoke('generate', { request: {}, channel: new Channel() })).rejects.toEqual({ kind: 'network', details: 'gone' });
});

test('NW-11: a pairing refusal comes back as its text', async () => {
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify('This code is wrong or has expired'), { status: 403 }));
  expect(await pair('nope')).toBe('This code is wrong or has expired');
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ paired: true }), { status: 200 }));
  expect(await pair('ABCD2345')).toBeNull();
});
