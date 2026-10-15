import { relativeDate } from '../../../frame/library-format';
import { strings } from '../../../ui/strings';

/** `6 h ago` within a day, else the Gallery's calendar-day wording (the un-chosen product, CR-24). */
export function hoursAgo(at: string | undefined, now = new Date()): string {
  if (!at) return strings.neverOpened;
  const hours = Math.round((now.getTime() - Date.parse(at)) / 36e5);
  return hours < 1 ? 'just now' : hours < 24 ? `${hours} h ago` : relativeDate(at, now);
}
/** `14 Oct 2026, 18:42`: date and time for the timeline. */
export const dateTime = (at?: string) => at ? new Date(at).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
export const dateOnly = (at?: string) => at ? new Date(at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
/** CR-12: *Prices for France in €*; the region name and the currency symbol come from the platform, falling back to the codes. */
export function localeNames(country: string, currency: string) {
  let name = country, symbol = currency;
  try { name = new Intl.DisplayNames(['en'], { type: 'region' }).of(country) ?? country; } catch { /* keep the code */ }
  try { symbol = new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).formatToParts(0).find(p => p.type === 'currency')?.value ?? currency; } catch { /* keep the code */ }
  return { name, symbol };
}
