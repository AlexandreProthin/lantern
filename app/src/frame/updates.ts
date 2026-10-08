// UP-1..UP-5, UP-11, UP-60/61: pure rules for when the launch check runs and when its notice shows.
import type { Settings } from './settings';
export const DAY_MS = 24 * 60 * 60 * 1000;
export const REVEAL_CLICKS = 5, REVEAL_WINDOW_MS = 3000;
export function shouldCheckAtLaunch(settings: Settings, now: number, desktop: boolean): boolean {
  if (!desktop || !settings.updates.checkAtLaunch) return false;
  // UP-61: a local update folder is checked at every launch.
  if (settings.developer.updateFolder) return true;
  const last = settings.ui.lastUpdateCheck;
  return !(last > 0 && last <= now && now - last < DAY_MS);
}
export function shouldShowNotice(settings: Settings, version: string, generating: boolean): boolean {
  return !generating && !!version && settings.ui.dismissedUpdate !== version;
}
/** UP-60: the click times on the version line reveal Developer after five within three seconds. */
export function revealsDeveloper(clicks: number[]): boolean {
  const recent = clicks.slice(-REVEAL_CLICKS);
  return recent.length === REVEAL_CLICKS && recent[REVEAL_CLICKS - 1] - recent[0] <= REVEAL_WINDOW_MS;
}
