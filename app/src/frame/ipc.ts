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

/** Lines `{"chunk"}` while the call runs, then `{"result"}` or `{"error"}`; closing the connection cancels it. */
async function generate(args: Record<string, unknown>): Promise<unknown> {
  const { channel, ...body } = args as { channel?: Channel } & Record<string, unknown>;
  const response = await post('/api/generate', body);
  if (!response.ok || !response.body) return failure(response);
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let end: number;
    while ((end = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
      if (!line) continue;
      const message = JSON.parse(line) as { chunk?: unknown; result?: unknown; error?: unknown };
      if ('chunk' in message) channel?.onmessage(message.chunk);
      else if ('result' in message) { void reader.cancel().catch(() => {}); return message.result; }
      else if ('error' in message) { void reader.cancel().catch(() => {}); throw message.error; }
    }
  }
  throw { kind: 'network', details: 'Lantern on the network closed the connection' };
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
