import { test, expect, type Page } from '@playwright/test';
// SE-60, SE-61: text size and theme apply at once, persist, and the light theme reaches every surface.
const css = (page: Page, selector: string, property: string) => page.locator(selector).first().evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), property);
/** The reading text's size; 0 while the panel is (re)drawing it, as a streamed text replaces its element. */
const reading = (page: Page) => page.evaluate(() => { const el = document.querySelector('.panel .md'); return el?.isConnected ? parseFloat(getComputedStyle(el).fontSize) || 0 : 0; });
const token = (page: Page, name: string) => page.evaluate(n => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name);

test('SE-60: text size scales reading and UI text but not the graph, and persists', async ({ page }) => {
  await page.goto('/?study=1&subject=Text%20size');
  const node = page.locator('.graph .node .name').first();
  await expect(node).toBeVisible();
  // The fake provider may still be writing the root's text under load; measure once it is there.
  await expect.poll(() => reading(page), { timeout: 15000 }).toBeGreaterThan(0);
  const before = { ui: parseFloat(await css(page, 'html', 'font-size')), reading: await reading(page), node: parseFloat(await css(page, '.graph .node .name', 'font-size')) };
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Appearance', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Text size' }).selectOption('largest');
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'largest');
  expect(parseFloat(await css(page, 'html', 'font-size'))).toBeCloseTo(before.ui * 1.2, 1);
  await expect.poll(() => reading(page)).toBeCloseTo(before.reading * 1.3, 1);
  expect(parseFloat(await css(page, '.graph .node .name', 'font-size'))).toBe(before.node);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings')!).appearance.textSize)).toBe('largest');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-text-size', 'largest');
  expect(parseFloat(await css(page, 'html', 'font-size'))).toBeCloseTo(before.ui * 1.2, 1);
});

test('SE-61: the light theme repaints the rooms, follows the system on request, and persists', async ({ page }) => {
  await page.goto('/?study=1&subject=Light%20theme');
  await expect(page.locator('.graph .node').first()).toBeVisible();
  expect(await token(page, '--bg')).toBe('#101827');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Appearance', exact: true }).click();
  const theme = dialog.getByRole('combobox', { name: 'Theme' });
  await expect(theme).toHaveValue('dark');
  await theme.selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await token(page, '--bg')).toBe('#f6f1e8');
  expect(await css(page, 'body', 'background-color')).toBe('rgb(246, 241, 232)');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#f6f1e8');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings')!).appearance.theme)).toBe('light');
  // Follow system: the page takes the operating system's scheme, and changes with it.
  await page.emulateMedia({ colorScheme: 'dark' });
  await theme.selectOption('system');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  // Choose has its own light tokens.
  await page.addInitScript(() => { const s = JSON.parse(localStorage.getItem('lantern.settings')!); s.ui.lastRoom = 'choose'; localStorage.setItem('lantern.settings', JSON.stringify(s)); });
  await page.goto('/?chooseRoom');
  await expect(page.locator('html')).toHaveAttribute('data-room', 'choose');
  await expect.poll(() => token(page, '--accent')).toBe('rgb(13, 107, 100)'); // a registered property: computed as rgb
  expect(await token(page, '--bg')).toBe('#f6f1e8');
});
