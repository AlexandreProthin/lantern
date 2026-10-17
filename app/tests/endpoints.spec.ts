import { test, expect } from '@playwright/test';
// CE-20 to CE-24, CE-30, CE-40, CE-52, CE-80: Settings → Provider → Endpoints, against the fake endpoint (IP-71).
test('CE-20/21/24/30/52: add an endpoint, fetch and pin its models, set thinking, and test one model', async ({ page }) => {
  await page.goto('/?study=1&subject=Endpoints');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Provider', exact: true }).click();
  await expect(dialog.getByRole('heading', { name: 'Claude Code' })).toBeVisible();
  await expect(dialog.getByTestId('endpoint')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Add endpoint', exact: true }).click();
  const endpoint = dialog.getByTestId('endpoint');
  await expect(endpoint.getByRole('textbox', { name: 'Server URL' })).toHaveValue('http://localhost:11434/v1');
  await expect(endpoint.getByText('No models yet.', { exact: false })).toBeVisible();
  await endpoint.getByRole('button', { name: 'Fetch models' }).click();
  await expect(endpoint.getByTestId('endpoint-status')).toHaveText('2 models on the server.');
  await expect(endpoint.getByRole('checkbox', { name: 'Pinned gemma4:e2b' })).toBeChecked();
  await expect(endpoint.getByRole('spinbutton', { name: 'Context size gemma4:e2b' })).toHaveValue('131072');
  await endpoint.getByRole('combobox', { name: 'Thinking qwen3:8b' }).selectOption('on');
  await endpoint.getByRole('checkbox', { name: 'Pinned qwen3:8b' }).uncheck();
  await endpoint.getByRole('button', { name: 'Test', exact: true }).click();
  await expect(endpoint.getByTestId('endpoint-status')).toHaveText(/^Ready · Ollama · gemma4:e2b · \d+ s$/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings') ?? '{}').provider.endpoints);
  expect(stored).toEqual([{ id: 'ollama', name: 'Ollama', preset: 'ollama', baseUrl: 'http://localhost:11434/v1', lanConfirmed: false, models: [
    { id: 'gemma4:e2b', pinned: true, thinking: 'off', contextSize: 131072 }, { id: 'qwen3:8b', pinned: false, thinking: 'on', contextSize: 131072 }] }]);
  // CE-80: a LAN address asks for the confirmation; changing the URL asks again.
  const url = endpoint.getByRole('textbox', { name: 'Server URL' });
  await url.fill('http://192.168.1.20:11434/v1'); await url.press('Tab');
  await endpoint.getByRole('checkbox', { name: 'This address is a computer on my local network' }).check();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings') ?? '{}').provider.endpoints[0].lanConfirmed)).toBe(true);
  // Reset to defaults in Provider keeps the endpoint.
  await dialog.getByRole('button', { name: 'Reset to defaults' }).click(); await dialog.getByRole('button', { name: 'Reset to defaults' }).click();
  await expect(dialog.getByTestId('endpoint')).toHaveCount(1);
  await endpoint.getByRole('button', { name: 'Remove', exact: true }).click(); await endpoint.getByRole('button', { name: 'Remove this endpoint' }).click();
  await expect(dialog.getByTestId('endpoint')).toHaveCount(0);
});
test('CE-40: an unreachable server is said plainly', async ({ page }) => {
  await page.goto('/?study=1&subject=Down&endpointError=unreachable');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Provider', exact: true }).click();
  await dialog.getByRole('button', { name: 'Add endpoint', exact: true }).click();
  await dialog.getByTestId('endpoint').getByRole('button', { name: 'Fetch models' }).click();
  await expect(dialog.getByTestId('endpoint-status')).toHaveText('Lantern could not reach the model server.');
});
