import { test, expect } from '@playwright/test';
// CE-58: Settings → Provider → Codex and Codex models in the pickers, against the fake Codex (IP-71).
test('CE-58: turning Codex on adds its models to the pickers, tests it, and a light-up on it keeps the effort', async ({ page }) => {
  await page.goto('/?study=1&subject=Codex');
  const panel = page.locator('.panel');
  await expect(panel.getByRole('button', { name: 'Test me', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Provider', exact: true }).click();
  const codex = dialog.locator('section.codex');
  await expect(codex.getByRole('heading', { name: 'Codex' })).toBeVisible();
  await expect(dialog.locator('#default-model optgroup')).toHaveCount(0);
  await codex.getByRole('checkbox', { name: 'Show Codex models in the model pickers' }).check();
  await expect(codex).toContainText('Found · codex-cli (fake) · Signed in');
  expect(await dialog.locator('#default-model optgroup').evaluateAll(g => g.map(x => [x.getAttribute('label'), x.querySelectorAll('option').length]))).toEqual([['Claude Code', 11], ['Codex', 4]]);
  await codex.getByRole('button', { name: 'Test', exact: true }).click();
  await expect(codex.getByRole('status')).toHaveText(/^Ready · Codex · Codex default · \d+ s$/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings') ?? '{}').provider.codex)).toBe(true);
  await dialog.getByRole('button', { name: 'Close', exact: true }).first().click();
  await page.locator('header .subject-field .title').click();
  await page.locator('.subject-menu #subject-model').selectOption('codex:gpt-6-luna');
  await page.keyboard.press('Escape');
  await panel.getByRole('button', { name: 'Mechanism 1', exact: false }).click();
  await panel.getByRole('button', { name: 'Light it up', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Test me', exact: true })).toBeEnabled();
  const meta = panel.locator('.meta').first();
  await expect(meta).toContainText('Codex · GPT-6 Luna · not evaluated'); await expect(meta).toContainText('medium');
});
test('CE-58: Codex not installed says how to install it, and no Claude Code banner shows', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lantern.settings', JSON.stringify({ format: 'lantern-settings/1', provider: { defaultModel: 'opus', defaultEffort: 'medium', codex: true } })));
  await page.goto('/?study=1&subject=NoCodex&codexError=not-installed');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Provider', exact: true }).click();
  const codex = dialog.locator('section.codex');
  await expect(codex.getByRole('status')).toHaveText('Codex is not installed. Install it from Settings → Provider → Codex, or pick another model.');
  await expect(codex.getByRole('link', { name: 'Install Codex' })).toHaveAttribute('href', 'https://developers.openai.com/codex/cli');
  await expect(page.locator('.provider-notice')).toHaveCount(0);
});
