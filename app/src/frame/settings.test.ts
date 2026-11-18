import { expect, test } from 'vitest';
import { defaultSettings, resolveTheme, validateSettings } from './settings';
import { learnSettingsDefaults, validateLearnSettings } from '../rooms/learn/settings';
const rooms = [{ id: 'learn', settings: { defaults: learnSettingsDefaults, validate: validateLearnSettings } }, { id: 'other', settings: { defaults: {}, validate: (s: Record<string, unknown>) => s } }];
test('SE-4/6: unknown keys survive while invalid known values independently default', () => {
  const result=validateSettings({ customRoom:{alpha:1}, provider:{defaultModel:'bad id',defaultEffort:'low',future:2},
    appearance:{reduceMotion:'off'},ui:{graphLayout:'tree'},user:{displayName:'  Alex  '},learn:{contextBudget:1999} },defaultSettings('C:\\Library','Windows name',rooms),rooms);
  expect(result.customRoom).toEqual({alpha:1});expect(result.provider.future).toBe(2);
  expect(result.provider.defaultModel).toBe('opus');expect(result.provider.defaultEffort).toBe('low');
  expect(result.appearance.reduceMotion).toBe('system');expect(result.ui.graphLayout).toBe('tree');expect((result.learn as {contextBudget:number}).contextBudget).toBe(12000);expect(result.user.displayName).toBe('Alex');
});
test('RS-10/SE-12: lastRoom falls back to the first room; each room group gets its defaults', () => {
  expect(validateSettings({ ui:{ lastRoom:'gone' } }, defaultSettings('', '', rooms), rooms).ui.lastRoom).toBe('learn');
  expect(validateSettings({ ui:{ lastRoom:'other' } }, defaultSettings('', '', rooms), rooms).ui.lastRoom).toBe('other');
  expect(validateSettings({}, defaultSettings('', '', rooms), rooms).learn).toEqual({ defaultTone:'curious', contextBudget:12000 });
  expect(validateSettings({ learn:{ defaultTone:{ custom:'x'.repeat(301) }, future:1 } }, defaultSettings('', '', rooms), rooms).learn).toEqual({ defaultTone:'curious', contextBudget:12000, future:1 });
});
test('SE-60/61/GV-140: text size, theme and the graph view default, keep valid values and repair invalid ones', () => {
  const base = defaultSettings('', '', rooms);
  expect(base.appearance.textSize).toBe('default'); expect(base.appearance.theme).toBe('dark'); expect(base.ui.graphView).toBe('graph');
  const kept = validateSettings({ appearance:{ textSize:'largest', theme:'system' }, ui:{ graphView:'outline' } }, base, rooms);
  expect(kept.appearance.textSize).toBe('largest'); expect(kept.appearance.theme).toBe('system'); expect(kept.ui.graphView).toBe('outline');
  const fixed = validateSettings({ appearance:{ textSize:'huge', theme:'sepia' }, ui:{ graphView:7 } }, base, rooms);
  expect(fixed.appearance.textSize).toBe('default'); expect(fixed.appearance.theme).toBe('dark'); expect(fixed.ui.graphView).toBe('graph');
  expect(fixed.appearance.reduceMotion).toBe('system');
});
test('SE-61: the system theme follows the operating system; dark and light are fixed', () => {
  expect(resolveTheme('system', true)).toBe('light'); expect(resolveTheme('system', false)).toBe('dark');
  expect(resolveTheme('dark', true)).toBe('dark'); expect(resolveTheme('light', false)).toBe('light');
});
