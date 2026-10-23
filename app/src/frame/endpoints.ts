/** CE-12, CE-20 to CE-24, CE-30, CE-52: the endpoints the user added, as `provider.endpoints` stores them. */
export type Preset = 'ollama' | 'llamacpp' | 'lmstudio' | 'nvidia' | 'custom';
export type Thinking = 'off' | 'on' | 'default';
export interface EndpointModel { id: string; pinned: boolean; contextSize?: number; thinking: Thinking }
export interface EndpointConfig { id: string; name: string; preset: Preset; baseUrl: string; lanConfirmed: boolean; models: EndpointModel[] }
/** What Rust's `generate` receives beside the request: one endpoint, sized and set for the model asked for. */
export interface WireEndpoint { id: string; preset: Preset; baseUrl: string; contextSize?: number; thinking: Thinking; lanConfirmed: boolean }

export const PRESETS: readonly Preset[] = ['ollama', 'llamacpp', 'lmstudio', 'nvidia', 'custom'];
const THINKING: readonly Thinking[] = ['off', 'on', 'default'];
/**
 * Cloud slice 2: what each preset allows, mirroring Rust's `caps` (provider/endpoint.rs). `thinking` lists the choices
 * Settings offers, the first being the default: NVIDIA refuses every way of turning thinking off (slice 0), so *Model
 * default* only. Rust holds the request details (format, `reasoning_effort`, where model facts come from).
 */
export interface PresetCaps { key: 'no' | 'optional' | 'required'; thinking: readonly Thinking[] }
export const PRESET_CAPS: Record<Preset, PresetCaps> = {
  ollama: { key: 'no', thinking: THINKING }, llamacpp: { key: 'no', thinking: THINKING }, lmstudio: { key: 'no', thinking: THINKING },
  nvidia: { key: 'required', thinking: ['default'] }, custom: { key: 'optional', thinking: THINKING },
};
const defaultThinking = (preset: Preset) => PRESET_CAPS[preset].thinking[0];
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Reads `provider.endpoints` leniently: a malformed entry is skipped, never thrown on. */
export function endpointsOf(provider: { [key: string]: unknown }): EndpointConfig[] {
  const raw = Array.isArray(provider.endpoints) ? provider.endpoints : [];
  const seen = new Set<string>();
  return raw.flatMap((e): EndpointConfig[] => {
    if (!isRecord(e) || typeof e.id !== 'string' || !/^[a-z0-9-]{1,32}$/.test(e.id) || e.id === 'codex' /* CE-58: Codex's prefix */ || seen.has(e.id) || typeof e.baseUrl !== 'string' || e.baseUrl.length > 500 || !PRESETS.includes(e.preset as Preset)) return [];
    seen.add(e.id);
    const ids = new Set<string>(), preset = e.preset as Preset;
    const models = (Array.isArray(e.models) ? e.models : []).flatMap((m): EndpointModel[] => !isRecord(m) || typeof m.id !== 'string' || !m.id || m.id.length > 100 || ids.has(m.id) || !ids.add(m.id) ? [] : [{
      id: m.id, pinned: m.pinned === true, thinking: PRESET_CAPS[preset].thinking.includes(m.thinking as Thinking) ? m.thinking as Thinking : defaultThinking(preset),
      ...(typeof m.contextSize === 'number' && Number.isInteger(m.contextSize) && m.contextSize > 0 ? { contextSize: m.contextSize } : {}) }]);
    return [{ id: e.id, name: typeof e.name === 'string' && e.name.trim() ? e.name.trim() : e.id, preset, baseUrl: e.baseUrl, lanConfirmed: e.lanConfirmed === true, models }];
  });
}
export function wireEndpoint(e: EndpointConfig, model: string): WireEndpoint {
  const m = e.models.find(x => x.id === model);
  return { id: e.id, preset: e.preset, baseUrl: e.baseUrl, thinking: m?.thinking ?? defaultThinking(e.preset), lanConfirmed: e.lanConfirmed, ...(m?.contextSize ? { contextSize: m.contextSize } : {}) };
}
/**
 * CE-30, CE-32: Ollama reports a model's maximum (131072 for Gemma 4 E2B), not what the machine can hold, and Lantern
 * sends the size on every call; so a size read from Ollama starts at 32k, editable. llama.cpp reports the size it was
 * launched with, which is kept as is.
 */
export const OLLAMA_DEFAULT_CONTEXT = 32768;
export const initialContextSize = (preset: Preset, reported: number) => preset === 'ollama' ? Math.min(reported, OLLAMA_DEFAULT_CONTEXT) : reported;
/** CE-12: what a preset fills in. */
export const PRESET_URLS: Record<Preset, string> = { ollama: 'http://localhost:11434/v1', llamacpp: 'http://localhost:8080/v1', lmstudio: 'http://localhost:1234/v1',
  nvidia: 'https://integrate.api.nvidia.com/v1', custom: '' };
/** A new endpoint from a preset, with an id not yet taken (`ollama`, `ollama-2`, …). */
export function newEndpoint(preset: Preset, taken: readonly EndpointConfig[], name: string): EndpointConfig {
  let id: string = preset, n = 1; while (taken.some(e => e.id === id)) id = `${preset}-${++n}`;
  return { id, name: n > 1 ? `${name} ${n}` : name, preset, baseUrl: PRESET_URLS[preset], lanConfirmed: false, models: [] };
}
/** CE-21: a fetched list merged into the stored models: settings kept, new models pinned when the list is short. */
export function mergeModels(stored: readonly EndpointModel[], fetched: readonly string[], preset: Preset = 'ollama'): EndpointModel[] {
  const pin = fetched.length <= 20;
  return [...stored.filter(m => fetched.includes(m.id) || m.pinned), ...fetched.filter(id => !stored.some(m => m.id === id)).map(id => ({ id, pinned: pin, thinking: defaultThinking(preset) }))];
}
const hostname = (baseUrl: string) => { try { return new URL(baseUrl).hostname.replace(/^\[|\]$/g, '').toLowerCase(); } catch { return null; } };
const isThisMachine = (h: string) => h === 'localhost' || h.endsWith('.localhost') || /^127\./.test(h) || h === '::1';
/** As Rust's `is_lan` (provider/endpoint.rs): private and link-local addresses, and local names. */
const isLanHost = (h: string) => /^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h) || /^f[cd][0-9a-f]{0,2}:|^fe[89ab][0-9a-f]?:/.test(h)
  || (!h.includes('.') && !h.includes(':')) || ['.local', '.lan', '.home.arpa', '.internal'].some(s => h.endsWith(s));
/**
 * CE-53, CE-81: whether subject text sent to this endpoint leaves this computer and the local network: NVIDIA always,
 * any other preset when its address is neither this machine nor a LAN address. An empty or broken URL is not cloud yet.
 */
export function isCloudEndpoint(e: { preset: Preset; baseUrl: string }): boolean {
  if (e.preset === 'nvidia') return true;
  const h = hostname(e.baseUrl); return h !== null && !!h && !isThisMachine(h) && !isLanHost(h);
}
/** CE-72: the address a key is bound to, as Rust's `host_of` writes it (`host`, or `host:port` for a port that is not the default). */
export const keyHost = (baseUrl: string) => { try { return new URL(baseUrl).host.toLowerCase(); } catch { return ''; } };
export const isHttps = (baseUrl: string) => { try { return new URL(baseUrl).protocol === 'https:'; } catch { return false; } };
/** CE-80: whether the URL is plain http to an address that is not this machine (so it needs the LAN confirmation). */
export function needsLanConfirmation(baseUrl: string): boolean {
  try { const u = new URL(baseUrl); const h = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
    return u.protocol === 'http:' && !(h === 'localhost' || h.endsWith('.localhost') || /^127\./.test(h) || h === '::1'); } catch { return false; }
}
export const endpointNames = (endpoints: readonly EndpointConfig[]) => Object.fromEntries(endpoints.map(e => [e.id, e.name]));
