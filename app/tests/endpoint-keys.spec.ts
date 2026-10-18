import { test, expect, type Page } from '@playwright/test';
// CE-70 to CE-76, CE-81, cloud slice 3: keys, consent and the long catalogue, against the fake key admin (it never keeps a key either).
const FAKE = 'nvapi-FAKE-planted-0123456789abcd12';
const openProvider = async (page: Page, query = '') => {
  await page.goto(`/?study=1&subject=Keys${query}`);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.getByRole('button', { name: 'Provider', exact: true }).click();
  return dialog;
};
/** CE-71: the key is nowhere the webview keeps or shows anything. */
const keyNowhere = async (page: Page) => {
  const found = await page.evaluate(k => [document.documentElement.outerHTML, JSON.stringify({ ...localStorage }), JSON.stringify({ ...sessionStorage }),
    ...[...document.querySelectorAll('input')].map(i => i.value)].filter(t => t.includes(k)).length, FAKE);
  expect(found).toBe(0);
};
const withNvidia = (page: Page) => page.addInitScript(() => localStorage.setItem('lantern.settings', JSON.stringify({ format: 'lantern-settings/1',
  provider: { defaultModel: 'opus', defaultEffort: 'medium', endpoints: [{ id: 'nvidia', name: 'NVIDIA', preset: 'nvidia', baseUrl: 'https://integrate.api.nvidia.com/v1', lanConfirmed: false,
    models: [{ id: 'nvidia/nemotron-3.5-super-vl-120b-a12b', pinned: true, thinking: 'default' }] }] } })));

test('CE-81: adding NVIDIA says where subject text goes, before anything is saved', async ({ page }) => {
  const dialog = await openProvider(page);
  await dialog.getByRole('combobox', { name: 'Add endpoint' }).selectOption('nvidia');
  await dialog.getByRole('button', { name: 'Add endpoint', exact: true }).click();
  const confirm = dialog.getByTestId('endpoint-confirm');
  await expect(confirm).toContainText('Subject text you send to NVIDIA models goes to integrate.api.nvidia.com, outside this computer.');
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog.getByTestId('endpoint')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings') ?? '{}').provider?.endpoints ?? [])).toEqual([]);
  await dialog.getByRole('button', { name: 'Add endpoint', exact: true }).click(); await dialog.getByTestId('endpoint-confirm').getByRole('button', { name: 'Add', exact: true }).click();
  const endpoint = dialog.getByTestId('endpoint');
  await expect(endpoint.getByRole('textbox', { name: 'Server URL' })).toHaveValue('https://integrate.api.nvidia.com/v1');
  await expect(endpoint.getByLabel('API key')).toHaveAttribute('type', 'password');
  // A local preset needs no consent and has no key field.
  await dialog.getByRole('combobox', { name: 'Add endpoint' }).selectOption('ollama'); await dialog.getByRole('button', { name: 'Add endpoint', exact: true }).click();
  await expect(dialog.getByTestId('endpoint')).toHaveCount(2); await expect(dialog.getByTestId('endpoint-confirm')).toHaveCount(0);
  await expect(dialog.locator('[data-endpoint="ollama"]').getByTestId('endpoint-key')).toHaveCount(0);
});
test('CE-70, CE-71, CE-76: a key is saved once, the field clears, only its last 4 show, and Replace and Remove are confirmed', async ({ page }) => {
  await withNvidia(page); const dialog = await openProvider(page); const endpoint = dialog.getByTestId('endpoint');
  const field = endpoint.getByLabel('API key');
  await field.fill(FAKE); await endpoint.getByRole('button', { name: 'Save key' }).click();
  await expect(endpoint.getByTestId('key-status')).toHaveText('Key set · …cd12');
  await expect(endpoint.getByLabel('API key')).toHaveCount(0); await keyNowhere(page);
  await expect(endpoint).toContainText('Kept in Windows Credential Manager for integrate.api.nvidia.com');
  // Replace: confirmed, then an empty field; the saved key is never shown.
  await endpoint.getByRole('button', { name: 'Replace key' }).click(); await endpoint.getByRole('button', { name: 'Replace the saved key' }).click();
  await expect(endpoint.getByLabel('API key')).toHaveValue(''); await expect(endpoint).toContainText('The saved key cannot be shown again.');
  await endpoint.getByLabel('API key').fill(FAKE.replace('cd12', 'ef34')); await endpoint.getByLabel('API key').press('Enter');
  await expect(endpoint.getByTestId('key-status')).toHaveText('Key set · …ef34'); await keyNowhere(page);
  // Remove: confirmed; Cancel keeps it.
  await endpoint.getByRole('button', { name: 'Remove key' }).click(); await endpoint.getByRole('button', { name: 'Cancel' }).click();
  await expect(endpoint.getByTestId('key-status')).toBeVisible();
  await endpoint.getByRole('button', { name: 'Remove key' }).click(); await endpoint.getByRole('button', { name: 'Remove the saved key' }).click();
  await expect(endpoint.getByLabel('API key')).toBeVisible(); await expect(endpoint.getByTestId('key-status')).toHaveCount(0);
});
test('CE-72: changing the host says the key goes, and removes it; an http address takes no key', async ({ page }) => {
  await withNvidia(page); const dialog = await openProvider(page); const endpoint = dialog.getByTestId('endpoint');
  await endpoint.getByLabel('API key').fill(FAKE); await endpoint.getByRole('button', { name: 'Save key' }).click();
  const url = endpoint.getByRole('textbox', { name: 'Server URL' });
  await url.fill('https://other.example.com/v1'); await url.press('Tab');
  const confirm = endpoint.getByTestId('endpoint-confirm');
  await expect(confirm).toContainText('The saved key belongs to integrate.api.nvidia.com. Changing the address removes it');
  await expect(confirm).toContainText('goes to other.example.com');
  await confirm.getByRole('button', { name: 'Cancel' }).click();
  await expect(url).toHaveValue('https://integrate.api.nvidia.com/v1'); await expect(endpoint.getByTestId('key-status')).toBeVisible();
  await url.fill('https://other.example.com/v1'); await url.press('Tab'); await endpoint.getByRole('button', { name: 'Use this address' }).click();
  await expect(endpoint.getByTestId('key-status')).toHaveCount(0); await expect(endpoint.getByLabel('API key')).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings') ?? '{}').provider.endpoints[0].baseUrl)).toBe('https://other.example.com/v1');
  // A Custom URL on this machine: no consent, the key optional and refused over http.
  await dialog.getByRole('combobox', { name: 'Add endpoint' }).selectOption('custom'); await dialog.getByRole('button', { name: 'Add endpoint', exact: true }).click();
  const custom = dialog.locator('[data-endpoint="custom"]'); const curl = custom.getByRole('textbox', { name: 'Server URL' });
  await curl.fill('http://localhost:8000/v1'); await curl.press('Tab');
  await expect(custom.getByTestId('endpoint-confirm')).toHaveCount(0); await expect(custom).toContainText('A key is only sent over https://, and this address is not.');
  await curl.fill('https://api.example.org/v1'); await curl.press('Tab');
  await expect(custom.getByTestId('endpoint-confirm')).toContainText('goes to api.example.org'); await custom.getByRole('button', { name: 'Use this address' }).click();
  await expect(custom).toContainText('An API key is optional here.');
});
test('CE-75, CE-40: removing the endpoint removes its key; a rejected key offers Replace key', async ({ page }) => {
  await withNvidia(page); const dialog = await openProvider(page, '&endpointError=key-rejected'); const endpoint = dialog.getByTestId('endpoint');
  await endpoint.getByLabel('API key').fill(FAKE); await endpoint.getByRole('button', { name: 'Save key' }).click();
  await endpoint.getByRole('button', { name: 'Test', exact: true }).click();
  await expect(endpoint.getByTestId('endpoint-status')).toHaveText('NVIDIA rejected the API key. Replace it in Settings → Provider → Endpoints.');
  await endpoint.getByTestId('key-rejected').getByRole('button', { name: 'Replace key' }).click();
  await expect(endpoint.getByLabel('API key')).toBeVisible();
  await endpoint.getByLabel('API key').fill(FAKE.replace('cd12', '9z9z')); await endpoint.getByRole('button', { name: 'Save key' }).click();
  await expect(endpoint.getByTestId('key-status')).toHaveText('Key set · …9z9z'); await expect(endpoint.getByTestId('endpoint-status')).toHaveText('Key saved. Test a model to check it.');
  await endpoint.getByRole('button', { name: 'Remove', exact: true }).click(); await endpoint.getByRole('button', { name: 'Remove this endpoint' }).click();
  // Added again under the same id, it has no key: the old one went with the endpoint.
  await dialog.getByRole('combobox', { name: 'Add endpoint' }).selectOption('nvidia'); await dialog.getByRole('button', { name: 'Add endpoint', exact: true }).click();
  await dialog.getByTestId('endpoint-confirm').getByRole('button', { name: 'Add', exact: true }).click();
  await expect(dialog.getByTestId('endpoint').getByLabel('API key')).toBeVisible(); await keyNowhere(page);
});
test('CE-21, cloud slice 3: a long catalogue is filtered, pins nothing by default, and offers only Model default thinking on NVIDIA', async ({ page }) => {
  await withNvidia(page); const dialog = await openProvider(page, '&endpointModels=120'); const endpoint = dialog.getByTestId('endpoint');
  await endpoint.getByRole('button', { name: 'Fetch models' }).click();
  await expect(endpoint.getByTestId('endpoint-status')).toHaveText('120 models on the server.');
  await expect(endpoint.getByText('121 of 121 models')).toBeVisible();
  await endpoint.getByRole('searchbox', { name: 'Filter models NVIDIA' }).fill('model-11');
  await expect(endpoint.getByText('10 of 121 models')).toBeVisible();
  await expect(endpoint.getByRole('checkbox', { name: 'Pinned vendor/model-11', exact: true })).not.toBeChecked();
  await endpoint.getByRole('checkbox', { name: 'Pinned vendor/model-11', exact: true }).check();
  const thinking = endpoint.getByRole('combobox', { name: 'Thinking vendor/model-11', exact: true });
  expect(await thinking.locator('option').allTextContents()).toEqual(['Model default']);
  await expect(endpoint).toContainText('NVIDIA does not let Lantern turn thinking off');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings') ?? '{}').provider.endpoints[0].models.filter((m: { pinned: boolean }) => m.pinned).map((m: { id: string }) => m.id)))
    .toEqual(['nvidia/nemotron-3.5-super-vl-120b-a12b', 'vendor/model-11']);
});
