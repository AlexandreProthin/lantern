import { invoke } from './ipc';
import { backend } from './host';

/** GV-17: the graph's pinned nodes per subject (node id → [x, y] in the free layout), in the app state file (SE-50), never in the subject. */
export type Pins = Record<string, [number, number]>;
export interface PinStore { load(subjectId: string): Promise<Pins>; save(subjectId: string, pins: Pins): Promise<void> }

/** Only well-formed entries: a non-empty id and two finite numbers. */
export function cleanPins(value: unknown): Pins {
  const out: Pins = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return out;
  for (const [id, at] of Object.entries(value)) {
    if (id && Array.isArray(at) && at.length === 2 && at.every(v => typeof v === 'number' && Number.isFinite(v))) out[id] = [at[0], at[1]];
  }
  return out;
}

export const desktopPinStore: PinStore = {
  load: async id => cleanPins((await invoke<{ pinned?: Record<string, unknown> }>('read_state')).pinned?.[id]),
  save: (id, pins) => invoke('save_pinned', { id, pins })
};

const KEY = 'lantern.pinned';
const readAll = (): Record<string, unknown> => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch { return {}; } };
/** The browser build's surrogate (fake-provider tests, the web demo). */
export const browserPinStore: PinStore = {
  async load(id) { return cleanPins(readAll()[id]); },
  async save(id, pins) {
    const all = readAll();
    if (Object.keys(pins).length) all[id] = pins; else delete all[id];
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* a view state; losing it is harmless */ }
  }
};
/** A deleted subject's pins go with it (the desktop drops them in `delete_subject`). */
export function browserForgetPins(id: string): void { void browserPinStore.save(id, {}); }

export const pinStore: PinStore = backend ? desktopPinStore : browserPinStore;
