/** CE-12, CE-20 to CE-24, CE-30, CE-52: the endpoints the user added, as `provider.endpoints` stores them. */
export type Preset = 'ollama' | 'llamacpp' | 'lmstudio' | 'custom';
export type Thinking = 'off' | 'on' | 'default';
export interface EndpointModel { id: string; pinned: boolean; contextSize?: number; thinking: Thinking }
export interface EndpointConfig { id: string; name: string; preset: Preset; baseUrl: string; lanConfirmed: boolean; models: EndpointModel[] }
/** What Rust's `generate` receives beside the request: one endpoint, sized and set for the model asked for. */
export interface WireEndpoint { id: string; preset: Preset; baseUrl: string; contextSize?: number; thinking: Thinking; lanConfirmed: boolean }

export const PRESETS: readonly Preset[] = ['ollama', 'llamacpp', 'lmstudio', 'custom'];
const THINKING: readonly Thinking[] = ['off', 'on', 'default'];
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Reads `provider.endpoints` leniently: a malformed entry is skipped, never thrown on. */
export function endpointsOf(provider: { [key: string]: unknown }): EndpointConfig[] {
  const raw = Array.isArray(provider.endpoints) ? provider.endpoints : [];
  const seen = new Set<string>();
  return raw.flatMap((e): EndpointConfig[] => {
    if (!isRecord(e) || typeof e.id !== 'string' || !/^[a-z0-9-]{1,32}$/.test(e.id) || seen.has(e.id) || typeof e.baseUrl !== 'string' || e.baseUrl.length > 500 || !PRESETS.includes(e.preset as Preset)) return [];
    seen.add(e.id);
    const ids = new Set<string>();
    const models = (Array.isArray(e.models) ? e.models : []).flatMap((m): EndpointModel[] => !isRecord(m) || typeof m.id !== 'string' || !m.id || m.id.length > 100 || ids.has(m.id) || !ids.add(m.id) ? [] : [{
      id: m.id, pinned: m.pinned === true, thinking: THINKING.includes(m.thinking as Thinking) ? m.thinking as Thinking : 'off',
      ...(typeof m.contextSize === 'number' && Number.isInteger(m.contextSize) && m.contextSize > 0 ? { contextSize: m.contextSize } : {}) }]);
    return [{ id: e.id, name: typeof e.name === 'string' && e.name.trim() ? e.name.trim() : e.id, preset: e.preset as Preset, baseUrl: e.baseUrl, lanConfirmed: e.lanConfirmed === true, models }];
  });
}
export function wireEndpoint(e: EndpointConfig, model: string): WireEndpoint {
  const m = e.models.find(x => x.id === model);
  return { id: e.id, preset: e.preset, baseUrl: e.baseUrl, thinking: m?.thinking ?? 'off', lanConfirmed: e.lanConfirmed, ...(m?.contextSize ? { contextSize: m.contextSize } : {}) };
}
/** CE-12: what a preset fills in. */
export const PRESET_URLS: Record<Preset, string> = { ollama: 'http://localhost:11434/v1', llamacpp: 'http://localhost:8080/v1', lmstudio: 'http://localhost:1234/v1', custom: '' };
/** A new endpoint from a preset, with an id not yet taken (`ollama`, `ollama-2`, …). */
export function newEndpoint(preset: Preset, taken: readonly EndpointConfig[], name: string): EndpointConfig {
  let id: string = preset, n = 1; while (taken.some(e => e.id === id)) id = `${preset}-${++n}`;
  return { id, name: n > 1 ? `${name} ${n}` : name, preset, baseUrl: PRESET_URLS[preset], lanConfirmed: false, models: [] };
}
/** CE-21: a fetched list merged into the stored models: settings kept, new models pinned when the list is short. */
export function mergeModels(stored: readonly EndpointModel[], fetched: readonly string[]): EndpointModel[] {
  const pin = fetched.length <= 20;
  return [...stored.filter(m => fetched.includes(m.id) || m.pinned), ...fetched.filter(id => !stored.some(m => m.id === id)).map(id => ({ id, pinned: pin, thinking: 'off' as Thinking }))];
}
/** CE-80: whether the URL is plain http to an address that is not this machine (so it needs the LAN confirmation). */
export function needsLanConfirmation(baseUrl: string): boolean {
  try { const u = new URL(baseUrl); const h = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    return u.protocol === 'http:' && !(h === 'localhost' || h.endsWith('.localhost') || /^127\./.test(h) || h === '::1'); } catch { return false; }
}
export const endpointNames = (endpoints: readonly EndpointConfig[]) => Object.fromEntries(endpoints.map(e => [e.id, e.name]));
