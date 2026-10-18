import { invoke } from '@tauri-apps/api/core';

/** CE-71: what Settings may know about a key: whether one is set, its last 4 characters and its host. Never the key. */
export interface KeyStatus { set: boolean; last4?: string | null; host?: string | null }
/** CE-70, CE-75: the key goes from the password field straight to Rust, which keeps it in Windows Credential Manager. */
export interface KeyAdmin { status(endpointId: string): Promise<KeyStatus>; set(endpointId: string, baseUrl: string, key: string): Promise<KeyStatus>; remove(endpointId: string): Promise<void> }
export const desktopKeyAdmin: KeyAdmin = {
  status: endpointId => invoke<KeyStatus>('endpoint_key_status', { endpointId }),
  set: (endpointId, baseUrl, key) => invoke<KeyStatus>('set_endpoint_key', { endpointId, baseUrl, key }),
  remove: endpointId => invoke<void>('remove_endpoint_key', { endpointId }),
};
/** IP-71: the browser build's stand-in. Like Rust it refuses http and odd keys, and it keeps only what a status shows, never the key. */
export function fakeKeyAdmin(): KeyAdmin {
  const kept = new Map<string, KeyStatus>();
  return {
    async status(endpointId) { return kept.get(endpointId) ?? { set: false }; },
    async set(endpointId, baseUrl, key) {
      let url: URL; try { url = new URL(baseUrl.replace(/\/+$/, '')); } catch { throw 'Not a valid URL'; }
      if (url.protocol !== 'https:') throw 'A key is only saved for an https:// address';
      const k = key.trim();
      if (!/^[A-Za-z0-9\-._~+/]+=*$/.test(k) || k.length > 2560) throw 'This does not look like an API key: letters, digits and - . _ ~ + / only, at most 2560 characters';
      const status = { set: true, last4: k.length >= 8 ? k.slice(-4) : null, host: url.host.toLowerCase() };
      kept.set(endpointId, status); return status;
    },
    async remove(endpointId) { kept.delete(endpointId); },
  };
}
export const fakeKeys = fakeKeyAdmin();
