import { expect, test } from 'vitest';
import { defaultSettings, validateSettings } from './settings';
test('SE-4/6: unknown keys survive while invalid known values independently default', () => {
  const result=validateSettings({ customRoom:{alpha:1}, provider:{defaultModel:'bad id',defaultEffort:'low',future:2},
    appearance:{reduceMotion:'off'},ui:{graphLayout:'tree'},user:{displayName:'  Alex  '},learn:{contextBudget:1999} },defaultSettings('C:\\Library','Windows name'));
  expect(result.customRoom).toEqual({alpha:1});expect(result.provider.future).toBe(2);
  expect(result.provider.defaultModel).toBe('opus');expect(result.provider.defaultEffort).toBe('low');
  expect(result.appearance.reduceMotion).toBe('system');expect(result.ui.graphLayout).toBe('tree');expect(result.learn.contextBudget).toBe(12000);expect(result.user.displayName).toBe('Alex');
});
