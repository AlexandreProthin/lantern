// NW-30, NW-32: the one door to Rust. In the Tauri window it is Tauri's own `invoke`; on another device
// the same calls go to the server Lantern runs on the network, and `generate` streams NDJSON lines.
import { invoke as tauriInvoke, Channel as TauriChannel } from '@tauri-apps/api/core';
import { native } from './host';

/** Tauri's channel in the window; a plain holder of `onmessage` on another device. */
export class Channel<T = unknown> {
  onmessage: (message: T) => void = () => {};
  constructor() { if (native) return new TauriChannel<T>() as unknown as Channel<T>; }
}

/** NW-32: a device that is no longer paired (forgotten on the desktop) goes back to its pairing screen. */
function unpaired(): never { location.reload(); throw new Error('unpaired'); }

async function failure(response: Response): Promise<never> {
  if (response.status === 401) unpaired();
  const body = await response.json().catch(() => response.statusText);
  throw body;
}

const post = (path: string, body: unknown, signal?: AbortSignal) =>
  fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin', signal });

/** NW-52: tries in a row, while the page is shown, before a lost connection becomes an error. */
const ATTEMPTS = 6;
const shown = () => document.visibilityState !== 'hidden';
/** Resolves when the page is shown again (a phone unlocked); at once when it is. */
const whenShown = () => new Promise<void>(resolve => {
  if (shown()) { resolve(); return; }
  const back = () => { if (shown()) { document.removeEventListener('visibilitychange', back); resolve(); } };
  document.addEventListener('visibilitychange', back);
});
const lost = (details: string) => ({ kind: 'network', details, model: '', usage: { input: 0, output: 0, thinking: 0, cacheRead: 0, cacheWrite: 0 }, durationMs: 0 });

/**
 * Lines `{"chunk"}` while the call runs, then `{"result"}` or `{"error"}`. NW-50..52: the call runs on the
 * desktop whatever happens to the connection. When it drops (the screen locked, the network changed), the
 * page asks again with the same request and the number of lines it has read, and carries on from there.
 */
async function generate(args: Record<string, unknown>): Promise<unknown> {
  const { channel, ...body } = args as { channel?: Channel } & Record<string, unknown>;
  let read = 0, failures = 0;
  for (;;) {
    await whenShown();
    // Back from a locked screen, a connection can look open and never deliver again: drop it and reattach.
    const controller = new AbortController();
    const hidden = () => { if (!shown()) document.addEventListener('visibilitychange', () => controller.abort(), { once: true }); };
    document.addEventListener('visibilitychange', hidden);
    try {
      const response = await post('/api/generate', read ? { ...body, from: read } : body, controller.signal);
      if (!response.ok || !response.body) return await failure(response);
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        failures = 0; buffer += value;
        let end: number;
        while ((end = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
          if (!line) continue;
          const message = JSON.parse(line) as { chunk?: unknown; result?: unknown; error?: unknown };
          read++;
          if ('chunk' in message) channel?.onmessage(message.chunk);
          else if ('result' in message) { void reader.cancel().catch(() => {}); return message.result; }
          else if ('error' in message) { void reader.cancel().catch(() => {}); throw message.error; }
        }
      }
    } catch (error) {
      // A thrown provider error or the server's refusal ends the call; only a broken connection is retried.
      if (!(error instanceof TypeError) && !(error instanceof DOMException)) throw error;
    } finally { document.removeEventListener('visibilitychange', hidden); }
    if (controller.signal.aborted) continue;
    if (shown() && ++failures >= ATTEMPTS) throw lost('Lantern on the network stopped answering');
    if (shown()) await new Promise(resolve => setTimeout(resolve, Math.min(500 * 2 ** failures, 8000)));
  }
}

export async function invoke<T>(command: string, args: Record<string, unknown> = {}): Promise<T> {
  if (native) return tauriInvoke<T>(command, args);
  if (command === 'generate') return generate(args) as Promise<T>;
  const response = await post(`/api/invoke/${command}`, args);
  if (!response.ok) return failure(response);
  return response.json() as Promise<T>;
}

/** NW-11: whether this browser holds a device token. */
export async function paired(): Promise<boolean> {
  const response = await fetch('/api/session', { credentials: 'same-origin' });
  return response.ok && ((await response.json()) as { paired: boolean }).paired;
}
/** NW-11: trades a pairing code for the device cookie; resolves to the refusal's text, or null. */
export async function pair(code: string): Promise<string | null> {
  const response = await post('/api/pair', { code });
  if (response.ok) return null;
  const body = await response.json().catch(() => response.statusText);
  return typeof body === 'string' ? body : 'Pairing failed';
}
