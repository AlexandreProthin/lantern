import type { Effort } from '../core/model';
import { endpointsOf, type EndpointConfig } from './endpoints';
/** SE-12: each room checks its own group, stored under its id. */
export interface RoomSettingsSpec { id: string; settings: { defaults: Record<string, unknown>; validate: (stored: Record<string, unknown>) => Record<string, unknown> } }
export interface Settings {
  format: 'lantern-settings/1'; library: { path: string; [key: string]: unknown }; user: { displayName: string; [key: string]: unknown };
  /** `endpoints` (CE-20) stays out of the defaults, so *Reset to defaults* never removes an endpoint. */
  provider: { defaultModel: string; defaultEffort: Effort; endpoints?: EndpointConfig[];
    /** CE-58: Codex models in the pickers; absent means off, and *Reset* keeps it, as it keeps the endpoints. */
    codex?: boolean; [key: string]: unknown };
  appearance: { reduceMotion: 'system' | 'on'; backdrop: boolean; showTokenStats: boolean; [key: string]: unknown };
  updates: { checkAtLaunch: boolean; [key: string]: unknown };
  /** DC-1, DC-11, DC-40, DC-42: the debug console. */
  developer: { updateFolder: string; debug: boolean; logFolder: string; record: boolean; consoleHeight: number; consoleCollapsed: boolean; [key: string]: unknown };
  /** SE-11, CO-1, CO-46: Amber on or off, and its model (effort is always low). */
  companion: { show: boolean; model: string; [key: string]: unknown };
  ui: { studySplitPercent: number; studyCollapsed: 'none' | 'graph' | 'panel'; legendCollapsed: boolean; lastRoom: string; graphLayout: 'free' | 'tree'; textLinks: boolean; lastUpdateCheck: number; dismissedUpdate: string; [key: string]: unknown };
  [key: string]: unknown;
}
export function defaultSettings(library = '', name = '', rooms: readonly RoomSettingsSpec[] = []): Settings {
  return { ...Object.fromEntries(rooms.map(room => [room.id, { ...room.settings.defaults }])), format: 'lantern-settings/1', library: { path: library }, user: { displayName: name }, provider: { defaultModel: 'opus', defaultEffort: 'medium' },
    appearance: { reduceMotion: 'system', backdrop: true, showTokenStats: true },
    updates: { checkAtLaunch: true }, developer: { updateFolder: '', debug: false, logFolder: '', record: false, consoleHeight: 280, consoleCollapsed: false }, companion: { show: true, model: 'claude-haiku-5-5' },
    ui: { studySplitPercent: 44, studyCollapsed: 'none', legendCollapsed: false, lastRoom: rooms[0]?.id ?? '', graphLayout: 'free', textLinks: true, lastUpdateCheck: 0, dismissedUpdate: '' } };
}
export function validateSettings(input: unknown, defaults = defaultSettings(), rooms: readonly RoomSettingsSpec[] = []): Settings {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, any> : {};
  const out = { ...raw, format: defaults.format } as Settings;
  for (const group of ['library','user','provider','appearance','updates','developer','companion','ui'] as const) {
    const stored = raw[group] && typeof raw[group] === 'object' && !Array.isArray(raw[group]) ? raw[group] : {};
    (out[group] as object) = { ...defaults[group], ...stored };
  }
  for (const room of rooms) {
    const stored = raw[room.id] && typeof raw[room.id] === 'object' && !Array.isArray(raw[room.id]) ? raw[room.id] : {};
    out[room.id] = room.settings.validate({ ...room.settings.defaults, ...stored });
  }
  const p = out.provider, a = out.appearance, u = out.ui, up = out.updates;
  if (typeof out.library.path !== 'string') out.library.path = defaults.library.path;
  if (typeof out.user.displayName !== 'string' || out.user.displayName.trim().length > 40 || !out.user.displayName.trim()) out.user.displayName = defaults.user.displayName;
  else out.user.displayName = out.user.displayName.trim();
  if (typeof p.defaultModel !== 'string' || !/^[A-Za-z0-9._:/-]{1,100}$/.test(p.defaultModel)) p.defaultModel = defaults.provider.defaultModel;
  const c = out.companion;
  if (typeof c.show !== 'boolean') c.show = defaults.companion.show;
  if (typeof c.model !== 'string' || !/^[A-Za-z0-9._:/-]{1,100}$/.test(c.model)) c.model = defaults.companion.model;
  if (!['low','medium','high','xhigh','max'].includes(p.defaultEffort)) p.defaultEffort = defaults.provider.defaultEffort;
  // CE-20, SE-6: a malformed endpoint is dropped, the others kept; the key is never a place for an API key (SE-7, CE-70).
  if ('endpoints' in p) p.endpoints = endpointsOf(p);
  if ('codex' in p && typeof p.codex !== 'boolean') delete p.codex;
  // GV-100 forbids overriding an OS reduced-motion preference with "never reduce".
  if (!['system','on'].includes(a.reduceMotion)) a.reduceMotion = 'system';
  if (typeof a.backdrop !== 'boolean') a.backdrop = defaults.appearance.backdrop;
  if (typeof a.showTokenStats !== 'boolean') a.showTokenStats = defaults.appearance.showTokenStats;
  if (typeof u.studySplitPercent !== 'number' || u.studySplitPercent < 20 || u.studySplitPercent > 80) u.studySplitPercent = 44;
  if (!['none','graph','panel'].includes(u.studyCollapsed)) u.studyCollapsed = 'none';
  if (!['free','tree'].includes(u.graphLayout)) u.graphLayout = 'free';
  if (typeof u.legendCollapsed !== 'boolean') u.legendCollapsed = false;
  if (typeof u.textLinks !== 'boolean') u.textLinks = true;
  if (typeof up.checkAtLaunch !== 'boolean') up.checkAtLaunch = true;
  if (typeof out.developer.updateFolder !== 'string' || out.developer.updateFolder.length > 1000) out.developer.updateFolder = '';
  const d = out.developer;
  if (typeof d.debug !== 'boolean') d.debug = false;
  if (typeof d.record !== 'boolean') d.record = false;
  if (typeof d.consoleCollapsed !== 'boolean') d.consoleCollapsed = false;
  if (typeof d.logFolder !== 'string' || d.logFolder.length > 1000) d.logFolder = '';
  if (typeof d.consoleHeight !== 'number' || !Number.isFinite(d.consoleHeight) || d.consoleHeight < 120 || d.consoleHeight > 2000) d.consoleHeight = 280;
  if (typeof u.lastUpdateCheck !== 'number' || !Number.isFinite(u.lastUpdateCheck) || u.lastUpdateCheck < 0) u.lastUpdateCheck = 0;
  if (typeof u.dismissedUpdate !== 'string' || u.dismissedUpdate.length > 40) u.dismissedUpdate = '';
  // RS-10: an unknown room id falls back to the first registered room.
  if (typeof u.lastRoom !== 'string' || (rooms.length && !rooms.some(room => room.id === u.lastRoom))) u.lastRoom = rooms[0]?.id ?? '';
  return out;
}
