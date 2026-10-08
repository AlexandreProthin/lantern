import { expect, test } from 'vitest';
import { defaultSettings, validateSettings } from './settings';
import { DAY_MS, revealsDeveloper, shouldCheckAtLaunch, shouldShowNotice } from './updates';
const NOW = 1_800_000_000_000;
test('UP-1/2/3/4: the launch check runs once a day, only on desktop, and can be switched off', () => {
  const s = defaultSettings();
  expect(shouldCheckAtLaunch(s, NOW, true)).toBe(true);
  expect(shouldCheckAtLaunch(s, NOW, false)).toBe(false);
  s.ui.lastUpdateCheck = NOW - DAY_MS + 1000; expect(shouldCheckAtLaunch(s, NOW, true)).toBe(false);
  s.ui.lastUpdateCheck = NOW - DAY_MS; expect(shouldCheckAtLaunch(s, NOW, true)).toBe(true);
  s.ui.lastUpdateCheck = NOW + 5000; expect(shouldCheckAtLaunch(s, NOW, true)).toBe(true); // clock moved back: do not wait out a future stamp
  s.ui.lastUpdateCheck = 0; s.updates.checkAtLaunch = false; expect(shouldCheckAtLaunch(s, NOW, true)).toBe(false);
});
test('UP-61: a local update folder is checked at every launch, still behind the launch switch', () => {
  const s = defaultSettings(); s.developer.updateFolder = 'C:\\releases'; s.ui.lastUpdateCheck = NOW - 1000;
  expect(shouldCheckAtLaunch(s, NOW, true)).toBe(true);
  s.updates.checkAtLaunch = false; expect(shouldCheckAtLaunch(s, NOW, true)).toBe(false);
});
test('UP-60: five clicks within three seconds reveal Developer', () => {
  expect(revealsDeveloper([0, 100, 200, 300])).toBe(false);
  expect(revealsDeveloper([0, 100, 200, 300, 400])).toBe(true);
  expect(revealsDeveloper([0, 1000, 2000, 3000, 3001])).toBe(false);
  expect(revealsDeveloper([0, 9000, 9100, 9200, 9300, 9400])).toBe(true);
});
test('UP-11/12: the notice hides for a dismissed version and while generating, and returns for a newer one', () => {
  const s = defaultSettings();
  expect(shouldShowNotice(s, '0.1.3', false)).toBe(true);
  expect(shouldShowNotice(s, '0.1.3', true)).toBe(false);
  expect(shouldShowNotice(s, '', false)).toBe(false);
  s.ui.dismissedUpdate = '0.1.3';
  expect(shouldShowNotice(s, '0.1.3', false)).toBe(false);
  expect(shouldShowNotice(s, '0.1.4', false)).toBe(true);
});
test('SE-6: invalid update values fall back without discarding the others', () => {
  const r = validateSettings({ updates: { checkAtLaunch: 'yes', extra: 1 }, ui: { lastUpdateCheck: -5, dismissedUpdate: 3, graphLayout: 'tree' } });
  expect(r.updates.checkAtLaunch).toBe(true); expect(r.updates.extra).toBe(1);
  expect(validateSettings({ developer: { updateFolder: 7 } }).developer.updateFolder).toBe('');
  expect(validateSettings({ developer: { updateFolder: 'D:\\rel' } }).developer.updateFolder).toBe('D:\\rel');
  expect(r.ui.lastUpdateCheck).toBe(0); expect(r.ui.dismissedUpdate).toBe(''); expect(r.ui.graphLayout).toBe('tree');
  const old = validateSettings({ format: 'lantern-settings/1' });
  expect(old.updates.checkAtLaunch).toBe(true);
});
