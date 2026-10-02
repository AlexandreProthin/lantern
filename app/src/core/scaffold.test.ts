import { expect, test } from 'vitest';
import { strings } from '../ui/strings';
import { providerMode } from '../frame/provider-mode';
test('PQ-4: shell strings have a central source', () => expect(strings.appName).toBe('Lantern'));
test('IP-71: web uses fake; desktop can opt into fake for development', () => {
  expect(providerMode(false)).toBe('fake');
  expect(providerMode(true)).toBe('claude');
  expect(providerMode(true, 'fake')).toBe('fake');
});
