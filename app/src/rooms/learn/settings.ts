import type { Tone } from '../../core/model';
import { validTone } from '../../core/model';
import type { Settings } from '../../frame/settings';

/** SE-12: Learn's settings live under `learn.*`; the frame stores the group and asks the room to check it. */
export interface LearnSettings { defaultTone: Tone; contextBudget: number; [key: string]: unknown }
export const learnSettingsDefaults: LearnSettings = { defaultTone: 'curious', contextBudget: 12000 };
/** Invalid known values fall back one by one; unknown keys are kept (SE-4/6). */
export function validateLearnSettings(stored: Record<string, unknown>): LearnSettings {
  const out = { ...learnSettingsDefaults, ...stored } as LearnSettings;
  if (!validTone(out.defaultTone)) out.defaultTone = learnSettingsDefaults.defaultTone;
  if (!Number.isInteger(out.contextBudget) || out.contextBudget < 2000 || out.contextBudget > 100000) out.contextBudget = learnSettingsDefaults.contextBudget;
  return out;
}
/** Validated settings always hold the group (validateSettings with the room list). */
export const learnSettings = (settings: Settings) => settings.learn as LearnSettings;
