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
  return raw.flatMap((e): EndpointConfig[] => {
    if (!isRecord(e) || typeof e.id !== 'string' || !/^[a-z0-9-]{1,32}$/.test(e.id) || typeof e.baseUrl !== 'string' || !PRESETS.includes(e.preset as Preset)) return [];
    const models = (Array.isArray(e.models) ? e.models : []).flatMap((m): EndpointModel[] => !isRecord(m) || typeof m.id !== 'string' || !m.id ? [] : [{
      id: m.id, pinned: m.pinned === true, thinking: THINKING.includes(m.thinking as Thinking) ? m.thinking as Thinking : 'off',
      ...(typeof m.contextSize === 'number' && Number.isInteger(m.contextSize) && m.contextSize > 0 ? { contextSize: m.contextSize } : {}) }]);
    return [{ id: e.id, name: typeof e.name === 'string' && e.name.trim() ? e.name.trim() : e.id, preset: e.preset as Preset, baseUrl: e.baseUrl, lanConfirmed: e.lanConfirmed === true, models }];
  });
}
export function wireEndpoint(e: EndpointConfig, model: string): WireEndpoint {
  const m = e.models.find(x => x.id === model);
  return { id: e.id, preset: e.preset, baseUrl: e.baseUrl, thinking: m?.thinking ?? 'off', lanConfirmed: e.lanConfirmed, ...(m?.contextSize ? { contextSize: m.contextSize } : {}) };
}
export const endpointNames = (endpoints: readonly EndpointConfig[]) => Object.fromEntries(endpoints.map(e => [e.id, e.name]));
