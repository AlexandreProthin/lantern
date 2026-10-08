// UP-1..UP-5, UP-11: pure rules for when the launch check runs and when its notice shows.
import type { Settings } from './settings';
export const DAY_MS = 24 * 60 * 60 * 1000;
export function shouldCheckAtLaunch(settings: Settings, now: number, desktop: boolean): boolean {
  if (!desktop || !settings.updates.checkAtLaunch) return false;
  const last = settings.ui.lastUpdateCheck;
  return !(last > 0 && last <= now && now - last < DAY_MS);
}
export function shouldShowNotice(settings: Settings, version: string, generating: boolean): boolean {
  return !generating && !!version && settings.ui.dismissedUpdate !== version;
}
