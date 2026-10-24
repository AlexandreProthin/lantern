import { test, expect, type Page } from '@playwright/test';

const stored = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings') ?? '{}').developer);

test('DC-1/2/11..15: debug mode docks the console, traces calls, and turning it off removes it', async ({ page }) => {
  await page.goto('/?study=1&subject=Ocean tides');
  await expect(page.locator('.panel').getByRole('button', { name: 'Test me', exact: true })).toBeEnabled();
  const console_ = page.getByRole('region', { name: 'Debug console' });
  await expect(console_).toHaveCount(0);

  // DC-1: the switch lives in the hidden Developer section (UP-60).
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const version = dialog.getByRole('button', { name: /^Lantern \d/ });
  for (let i = 0; i < 5; i++) await version.click();
  const debug = dialog.getByRole('switch', { name: 'Debug mode' });
  await expect(debug).not.toBeChecked();
  await expect(dialog.getByRole('textbox', { name: 'Log folder' })).toHaveValue('');
  await expect(dialog.getByRole('button', { name: 'Clear log folder' })).toBeDisabled();
  await debug.check();
  await expect.poll(async () => (await stored(page))?.debug).toBe(true);
  // The modal dialog makes the page behind it inert, so the console is checked once it closes.
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(console_).toBeVisible();
  await expect(console_.locator('.entry[data-kind="call"]')).toHaveCount(0);

  // DC-1, DC-20: Developer stays listed while debug is on; the Settings Test button is traced like any call.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Developer', exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Provider', exact: true }).click();
  await dialog.getByRole('button', { name: 'Test', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Test', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('status')).toContainText('Signed in');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  const calls = console_.locator('.entry[data-kind="call"]');
  await expect(calls).toHaveCount(1);
  await expect(calls.first().locator('.status')).toHaveText('ok');
  await expect(calls.first()).toContainText(/\d+→\d+ tok/);

  // DC-2: the console persists across a reload; a new subject's intro call appears in it.
  await page.goto('/?study=1&subject=Tide pools');
  await expect(console_).toBeVisible();
  await expect(calls.first()).toBeVisible();
  await expect(calls.last().locator('.status')).toHaveText('ok', { timeout: 15_000 });
  const box = await console_.boundingBox(); const viewport = page.viewportSize()!;
  expect(Math.round(box!.y + box!.height)).toBeGreaterThanOrEqual(viewport.height - 2);
  expect(box!.width).toBeGreaterThan(viewport.width - 4);

  // DC-13/21: a call expands into its sections.
  const first = calls.first();
  await first.locator('.line').click();
  await expect(first.locator('.line')).toHaveAttribute('aria-expanded', 'true');
  for (const section of ['Origin', 'Request', 'System prompt', 'Prompt', 'Stream', 'Result']) await expect(first.locator('summary', { hasText: new RegExp(`^${section}\\b`) })).toBeVisible();
  await expect(console_.getByRole('button', { name: 'Copy', exact: true })).toBeEnabled();

  // DC-15: the filter narrows the rows and the header counts them.
  const total = await console_.locator('.entry').count();
  await expect(console_.getByTestId('debug-count')).toHaveText(`${total} / ${total}`);
  await console_.getByRole('button', { name: 'Filter', exact: true }).click();
  await console_.getByRole('searchbox', { name: 'Search' }).fill('zz-no-such-text');
  await expect(console_.getByText('No entry matches the filter.')).toBeVisible();
  await expect(console_.getByTestId('debug-count')).toHaveText(`0 / ${total}`);
  await console_.getByRole('button', { name: 'Reset filter' }).click();
  await expect(console_.locator('.entry')).toHaveCount(total);

  // DC-11: collapse to the header and back; persisted.
  await console_.getByRole('button', { name: 'Collapse the console' }).click();
  await expect(console_.locator('.list')).toHaveCount(0);
  await expect.poll(async () => (await stored(page))?.consoleCollapsed).toBe(true);
  await console_.getByRole('button', { name: 'Expand the console' }).click();
  await expect(console_.locator('.list')).toBeVisible();

  // DC-11: drag the top edge to resize; saved on release.
  const before = (await console_.boundingBox())!.height;
  const grip = console_.getByRole('separator', { name: 'Resize the console' });
  const g = (await grip.boundingBox())!;
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2); await page.mouse.down();
  await page.mouse.move(g.x + g.width / 2, g.y - 80, { steps: 4 }); await page.mouse.up();
  await expect.poll(async () => (await console_.boundingBox())!.height).toBeGreaterThan(before + 40);
  await expect.poll(async () => (await stored(page))?.consoleHeight).toBeGreaterThan(before + 40);

  // DC-14: Clear empties the console.
  await console_.getByRole('button', { name: 'Clear', exact: true }).click();
  await expect(console_.locator('.entry')).toHaveCount(0);
  await expect(console_.getByText('No entries yet', { exact: false })).toBeVisible();

  // DC-1/2: Developer stays shown while debug is on; turning it off removes the console.
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await dialog.getByRole('button', { name: 'Developer', exact: true }).click();
  await dialog.getByRole('switch', { name: 'Debug mode' }).uncheck();
  await expect(console_).toHaveCount(0);
  await expect.poll(async () => (await stored(page))?.debug).toBe(false);
});
