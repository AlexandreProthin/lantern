import { expect, test } from 'vitest';
import { defaultSettings, validateSettings } from './settings';
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
