import { currencyOf } from '../settings';

/** CR-90: the countries the app knows a currency for (settings.ts); a stored country outside the list is kept and shown by its code. */
export const countryCodes = ['AT', 'AU', 'BE', 'BR', 'CA', 'CH', 'CN', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IN', 'IT', 'JP', 'KR',
  'LT', 'LU', 'LV', 'MC', 'MT', 'MX', 'NL', 'NO', 'NZ', 'PL', 'PT', 'RO', 'SE', 'SG', 'SI', 'SK', 'TR', 'US', 'ZA'];
export function countryName(code: string): string {
  try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) ?? code; } catch { return code; }
}
/** Country options by name, with the current one added when it is not in the list. */
export const countryOptions = (current: string) => [...new Set([...countryCodes, current])].map(code => ({ code, name: countryName(code) })).sort((a, b) => a.name.localeCompare(b.name));
export const currencyOptions = (current: string) => [...new Set([...countryCodes.map(currencyOf), current])].sort();
