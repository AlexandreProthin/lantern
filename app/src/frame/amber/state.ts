import { invoke } from '@tauri-apps/api/core';
/** SE-50, CO-15, CO-21: Amber's part of the app state file, under `companion`. Room and space ids are data here; the frame names no room. */
export interface AmberState { spots: Record<string, string>; seenTips: string[] }
export const emptyAmberState = (): AmberState => ({ spots: {}, seenTips: [] });
export const spotKey = (room: string, space: string) => `${room}/${space}`;
const ID = /^[A-Za-z0-9._:/-]{1,80}$/;

/** A missing or damaged part yields empty state for that part; unknown keys are dropped (only Rust keeps the file's other keys). */
export function parseAmberState(raw: unknown): AmberState {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const spots = value.spots && typeof value.spots === 'object' && !Array.isArray(value.spots)
    ? Object.fromEntries(Object.entries(value.spots as Record<string, unknown>).filter((e): e is [string, string] => ID.test(e[0]) && typeof e[1] === 'string' && ID.test(e[1]))) : {};
  const seenTips = Array.isArray(value.seenTips) ? [...new Set(value.seenTips.filter((t): t is string => typeof t === 'string' && ID.test(t)))] : [];
  return { spots, seenTips };
}
export function setSpot(state: AmberState, room: string, space: string, spot: string): AmberState {
  return { ...state, spots: { ...state.spots, [spotKey(room, space)]: spot } };
}
export const spotOf = (state: AmberState, room: string, space: string): string | undefined => state.spots[spotKey(room, space)];
export function markTipSeen(state: AmberState, id: string): AmberState {
  return state.seenTips.includes(id) ? state : { ...state, seenTips: [...state.seenTips, id] };
}
/** CO-21: tips not yet seen first, in pool order; once all are seen, the cycle restarts after the last one shown. */
export function nextTip(pool: readonly string[], state: AmberState, last?: string): string | undefined {
  const unseen = pool.find(id => !state.seenTips.includes(id));
  if (unseen) return unseen;
  if (!pool.length) return undefined;
  const at = last ? pool.indexOf(last) : -1;
  return pool[(at + 1) % pool.length];
}

export interface AmberStateStore { load(): Promise<AmberState>; save(state: AmberState): Promise<void> }
export const desktopAmberStore: AmberStateStore = {
  load: async () => parseAmberState((await invoke<{ companion?: unknown }>('read_state')).companion),
  save: companion => invoke('save_companion_state', { companion })
};
const KEY = 'lantern.companion';
/** Browser build surrogate (fake-provider tests). */
export const browserAmberStore: AmberStateStore = {
  async load() { try { return parseAmberState(JSON.parse(localStorage.getItem(KEY) ?? 'null')); } catch { return emptyAmberState(); } },
  async save(state) { localStorage.setItem(KEY, JSON.stringify(state)); }
};
