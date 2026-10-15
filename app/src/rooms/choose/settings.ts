import type { Tone } from '../../core/model';
import { validTone } from '../../core/model';
import type { Settings } from '../../frame/settings';
import type { Locale } from './rules';

/** CR-90: the room's settings under `choose.*`; model and effort stay in Provider. */
export interface ChooseSettings { country: string; currency: string; defaultTone: Tone; useWeb: boolean; [key: string]: unknown }
/** The currency a country uses; a country not listed falls back to EUR, which the user can change. */
const currencies: Record<string, string> = {
  AT: 'EUR', BE: 'EUR', CY: 'EUR', DE: 'EUR', EE: 'EUR', ES: 'EUR', FI: 'EUR', FR: 'EUR', GR: 'EUR', HR: 'EUR', IE: 'EUR', IT: 'EUR',
  LT: 'EUR', LU: 'EUR', LV: 'EUR', MC: 'EUR', MT: 'EUR', NL: 'EUR', PT: 'EUR', SI: 'EUR', SK: 'EUR',
  AU: 'AUD', BR: 'BRL', CA: 'CAD', CH: 'CHF', CN: 'CNY', CZ: 'CZK', DK: 'DKK', GB: 'GBP', HU: 'HUF', IN: 'INR', JP: 'JPY', KR: 'KRW',
  MX: 'MXN', NO: 'NOK', NZ: 'NZD', PL: 'PLN', RO: 'RON', SE: 'SEK', SG: 'SGD', TR: 'TRY', US: 'USD', ZA: 'ZAR',
};
export const currencyOf = (country: string) => currencies[country] ?? 'EUR';
/** CR-90: the system's region (Windows' region reaches the webview as the language tag), else FR. */
export function systemCountry(languages: readonly string[] = typeof navigator === 'undefined' ? [] : navigator.languages): string {
  for (const tag of languages) { const region = /^[a-z]{2,3}-([A-Z]{2})\b/i.exec(tag)?.[1]?.toUpperCase(); if (region) return region; }
  return 'FR';
}
export function chooseSettingsDefaults(country = systemCountry()): ChooseSettings {
  return { country, currency: currencyOf(country), defaultTone: 'curious', useWeb: true };
}
/** Invalid known values fall back one by one; unknown keys are kept (SE-4/6). */
export function validateChooseSettings(stored: Record<string, unknown>): ChooseSettings {
  const defaults = chooseSettingsDefaults(), out = { ...defaults, ...stored } as ChooseSettings;
  if (typeof out.country !== 'string' || !/^[A-Z]{2}$/.test(out.country)) out.country = defaults.country;
  if (typeof out.currency !== 'string' || !/^[A-Z]{3}$/.test(out.currency)) out.currency = currencyOf(out.country);
  if (!validTone(out.defaultTone)) out.defaultTone = defaults.defaultTone;
  if (typeof out.useWeb !== 'boolean') out.useWeb = defaults.useWeb;
  return out;
}
/** Validated settings always hold the group (validateSettings with the room list). */
export const chooseSettings = (settings: Settings) => settings.choose as ChooseSettings;
export const localeOf = (s: ChooseSettings): Locale => ({ country: s.country, currency: s.currency });
