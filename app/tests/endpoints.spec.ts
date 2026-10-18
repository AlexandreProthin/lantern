import { test, expect } from '@playwright/test';
// CE-20 to CE-24, CE-30, CE-40, CE-52, CE-80: Settings → Provider → Endpoints, against the fake endpoint (IP-71).
const withEndpoint = (page: import('@playwright/test').Page) => page.addInitScript(() => localStorage.setItem('lantern.settings', JSON.stringify({ format: 'lantern-settings/1',
  provider: { defaultModel: 'opus', defaultEffort: 'medium', endpoints: [{ id: 'ollama', name: 'Ollama', preset: 'ollama', baseUrl: 'http://localhost:11434/v1', lanConfirmed: false,
    models: [{ id: 'gemma4:e2b', pinned: true, thinking: 'off', contextSize: 32768 }, { id: 'qwen3:8b', pinned: false, thinking: 'off' }] }] } })));
test('CE-22/25/56, TP-31: pinned endpoint models join every picker; a light-up on one names it, says not evaluated, shows no effort, and keeps unclosed options', async ({ page }) => {
  await withEndpoint(page);
  await page.goto('/?study=1&subject=Picker&endpointReply=unclosed');
  const panel = page.locator('.panel');
  await expect(panel.getByRole('button', { name: 'Test me', exact: true })).toBeEnabled();
  await page.locator('header .subject-field .title').click();
  const picker = page.locator('.subject-menu #subject-model');
  expect(await picker.locator('optgroup').evaluateAll(g => g.map(x => [x.getAttribute('label'), x.querySelectorAll('option').length]))).toEqual([['Claude Code', 11], ['Ollama', 1]]);
  await expect(picker.locator('option[value="ollama:gemma4:e2b"]')).toHaveText('gemma4:e2b · not evaluated');
  await expect(picker.locator('option[value="ollama:qwen3:8b"]')).toHaveCount(0);
  await picker.selectOption('ollama:gemma4:e2b');
  await page.keyboard.press('Escape');
  await panel.getByRole('button', { name: 'Mechanism 1', exact: false }).click();
  await panel.getByRole('button', { name: 'Light it up', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Test me', exact: true })).toBeEnabled();
  const meta = panel.locator('.meta').first();
  await expect(meta).toContainText('Ollama · gemma4:e2b · not evaluated'); await expect(meta).not.toContainText('medium');
  await expect(panel.getByRole('button', { name: 'Mechanism 2', exact: false })).toBeVisible();
  // CO-46: Amber's model picker offers the same endpoint model.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Companion', exact: true }).click();
  await dialog.locator('#amber-model').selectOption('ollama:gemma4:e2b');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings') ?? '{}').companion.model)).toBe('ollama:gemma4:e2b');
});
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
  await expect(endpoint.getByRole('spinbutton', { name: 'Context size gemma4:e2b' })).toHaveValue('32768');
  await endpoint.getByRole('combobox', { name: 'Thinking qwen3:8b' }).selectOption('on');
  await endpoint.getByRole('checkbox', { name: 'Pinned qwen3:8b' }).uncheck();
  await endpoint.getByRole('button', { name: 'Test', exact: true }).click();
  await expect(endpoint.getByTestId('endpoint-status')).toHaveText(/^Ready · Ollama · gemma4:e2b · \d+ s$/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings') ?? '{}').provider.endpoints);
  expect(stored).toEqual([{ id: 'ollama', name: 'Ollama', preset: 'ollama', baseUrl: 'http://localhost:11434/v1', lanConfirmed: false, models: [
    { id: 'gemma4:e2b', pinned: true, thinking: 'off', contextSize: 32768 }, { id: 'qwen3:8b', pinned: false, thinking: 'on', contextSize: 32768 }] }]);
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
test('CE-41, CE-40: a slow first byte says the model is loading; a server that is down is named on the node', async ({ page }) => {
  await withEndpoint(page);
  await page.goto('/?study=1&subject=Waits&endpointDelay=1500');
  const panel = page.locator('.panel');
  await expect(panel.getByRole('button', { name: 'Test me', exact: true })).toBeEnabled();
  await page.locator('header .subject-field .title').click();
  await page.locator('.subject-menu #subject-model').selectOption('ollama:gemma4:e2b'); await page.keyboard.press('Escape');
  await panel.getByRole('button', { name: 'Mechanism 1', exact: false }).click();
  await panel.getByRole('button', { name: 'Light it up', exact: true }).click();
  await expect(panel.getByText('Ollama is loading the model and reading the prompt.', { exact: false })).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Test me', exact: true })).toBeEnabled();
  await expect(panel.locator('.loading-model')).toHaveCount(0);
  // The same subject with the server down: the node's notice names Ollama and where it was looked for.
  await page.goto('/?study=1&subject=Down%20server&endpointError=unreachable');
  await expect(panel.getByRole('button', { name: 'Test me', exact: true })).toBeEnabled();
  await page.locator('header .subject-field .title').click();
  await page.locator('.subject-menu #subject-model').selectOption('ollama:gemma4:e2b'); await page.keyboard.press('Escape');
  await page.locator('.panel').getByRole('button', { name: 'Application 1', exact: false }).click();
  await page.locator('.panel').getByRole('button', { name: 'Light it up', exact: true }).click();
  await expect(page.locator('.panel').getByText('Ollama is not answering at localhost:11434. Start it, then try again.')).toBeVisible();
});
test('CE-40: an unreachable server is said plainly', async ({ page }) => {
  await page.goto('/?study=1&subject=Down&endpointError=unreachable');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Provider', exact: true }).click();
  await dialog.getByRole('button', { name: 'Add endpoint', exact: true }).click();
  await dialog.getByTestId('endpoint').getByRole('button', { name: 'Fetch models' }).click();
  await expect(dialog.getByTestId('endpoint-status')).toHaveText('Ollama is not answering at localhost:11434. Start it, then try again.');
});
