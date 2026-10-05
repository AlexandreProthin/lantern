import { strings } from '../ui/strings';
import { modelName as baseModelName } from '../core/models';
export const tokens = (n = 0) => n >= 1e6 ? `${(n/1e6).toFixed(1)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}k` : String(n);
export const exactDate = (at?: string) => at ? new Date(at).toLocaleString() : strings.neverOpened;
export function relativeDate(at?: string, now = new Date()): string {
  if (!at) return strings.neverOpened;
  const date = new Date(at);
  // Calendar days, not elapsed 24-hour periods (DST and midnight matter).
  const day = (d: Date) => Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
  const days = Math.round((day(now)-day(date))/86400000);
  return days === 0 ? strings.today : days === 1 ? strings.yesterday : days > 1 && days < 7 ? strings.daysAgo(days) : date.toLocaleDateString();
}
export function modelName(id: string | null | undefined) {
  return id ? baseModelName(id) : strings.noneYet;
}
