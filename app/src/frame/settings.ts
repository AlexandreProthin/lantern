import type { Effort, Tone } from '../core/model';
export interface Settings {
  format: 'lantern-settings/1'; library: { path: string; [key: string]: unknown }; user: { displayName: string; [key: string]: unknown };
  provider: { defaultModel: string; defaultEffort: Effort; [key: string]: unknown };
  learn: { defaultTone: Tone; contextBudget: number; [key: string]: unknown };
  appearance: { reduceMotion: 'system' | 'on'; showTokenStats: boolean; [key: string]: unknown };
  updates: { checkAtLaunch: boolean; [key: string]: unknown };
  ui: { studySplitPercent: number; studyCollapsed: 'none' | 'graph' | 'panel'; legendCollapsed: boolean; lastRoom: string; graphLayout: 'free' | 'tree'; textLinks: boolean; lastUpdateCheck: number; dismissedUpdate: string; [key: string]: unknown };
  [key: string]: unknown;
}
export function defaultSettings(library = '', name = ''): Settings {
  return { format: 'lantern-settings/1', library: { path: library }, user: { displayName: name }, provider: { defaultModel: 'opus', defaultEffort: 'medium' },
    learn: { defaultTone: 'curious', contextBudget: 12000 }, appearance: { reduceMotion: 'system', showTokenStats: true },
    updates: { checkAtLaunch: true },
    ui: { studySplitPercent: 44, studyCollapsed: 'none', legendCollapsed: false, lastRoom: 'learn', graphLayout: 'free', textLinks: true, lastUpdateCheck: 0, dismissedUpdate: '' } };
}
export function validateSettings(input: unknown, defaults = defaultSettings()): Settings {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input as Record<string, any> : {};
  const out = { ...raw, format: defaults.format } as Settings;
  for (const group of ['library','user','provider','learn','appearance','updates','ui'] as const) {
    const stored = raw[group] && typeof raw[group] === 'object' && !Array.isArray(raw[group]) ? raw[group] : {};
    (out[group] as object) = { ...defaults[group], ...stored };
  }
  const p = out.provider, l = out.learn, a = out.appearance, u = out.ui, up = out.updates;
  if (typeof out.library.path !== 'string') out.library.path = defaults.library.path;
  if (typeof out.user.displayName !== 'string' || out.user.displayName.trim().length > 40 || !out.user.displayName.trim()) out.user.displayName = defaults.user.displayName;
  else out.user.displayName = out.user.displayName.trim();
  if (typeof p.defaultModel !== 'string' || !/^[A-Za-z0-9._:-]{1,100}$/.test(p.defaultModel)) p.defaultModel = defaults.provider.defaultModel;
  if (!['low','medium','high','xhigh','max'].includes(p.defaultEffort)) p.defaultEffort = defaults.provider.defaultEffort;
  if (!['eli5','curious','student','engineer','expert'].includes(l.defaultTone as string) && !(l.defaultTone && typeof l.defaultTone === 'object' && typeof l.defaultTone.custom === 'string' && l.defaultTone.custom.length <= 300)) l.defaultTone = defaults.learn.defaultTone;
  if (!Number.isInteger(l.contextBudget) || l.contextBudget < 2000 || l.contextBudget > 100000) l.contextBudget = defaults.learn.contextBudget;
  // GV-100 forbids overriding an OS reduced-motion preference with "never reduce".
  if (!['system','on'].includes(a.reduceMotion)) a.reduceMotion = 'system';
  if (typeof a.showTokenStats !== 'boolean') a.showTokenStats = defaults.appearance.showTokenStats;
  if (typeof u.studySplitPercent !== 'number' || u.studySplitPercent < 20 || u.studySplitPercent > 80) u.studySplitPercent = 44;
  if (!['none','graph','panel'].includes(u.studyCollapsed)) u.studyCollapsed = 'none';
  if (!['free','tree'].includes(u.graphLayout)) u.graphLayout = 'free';
  if (typeof u.legendCollapsed !== 'boolean') u.legendCollapsed = false;
  if (typeof u.textLinks !== 'boolean') u.textLinks = true;
  if (typeof up.checkAtLaunch !== 'boolean') up.checkAtLaunch = true;
  if (typeof u.lastUpdateCheck !== 'number' || !Number.isFinite(u.lastUpdateCheck) || u.lastUpdateCheck < 0) u.lastUpdateCheck = 0;
  if (typeof u.dismissedUpdate !== 'string' || u.dismissedUpdate.length > 40) u.dismissedUpdate = '';
  u.lastRoom = 'learn'; return out;
}
