import { test, expect, type Page } from '@playwright/test';
// NW-40..43: the phone layout, below 720 px. Desktop widths keep the split.
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('NW-40, NW-41: a phone gets two bar rows, the graph alone, and the panel as a sheet opened by a tap', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/?study=1&subject=Ocean%20tides');
  const field = page.locator('header .subject-field'), capsule = page.locator('header .capsule');
  await expect(field).toBeVisible();
  const [f, c] = [(await field.boundingBox())!, (await capsule.boundingBox())!];
  expect(f.y).toBeGreaterThan(c.y + c.height - 1);
  expect(f.width).toBeGreaterThan(330);
  await expect(page.locator('header .kbd')).toBeHidden();
  const sheet = page.locator('.study .panel-side');
  await expect(sheet).toBeHidden();
  const node = page.locator('.node[data-id]').filter({ hasText: 'Mechanism 1' });
  await expect(node).toBeVisible();
  await node.click();
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText('This node is still dark.')).toBeVisible();
  expect((await sheet.boundingBox())!.width).toBe(375);
  await sheet.getByRole('button', { name: /Graph/ }).click();
  await expect(sheet).toBeHidden();
  await page.getByRole('button', { name: 'Details' }).click();
  await expect(sheet).toBeVisible();
  expect(await noSideScroll(page)).toBe(true);
  expect(errors).toEqual([]);
});

test('NW-40, NW-42: Settings fills a phone screen and its fields are 16 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const dialog = page.locator('dialog.settings');
  await expect(dialog).toBeVisible();
  expect(await dialog.boundingBox()).toMatchObject({ x: 0, y: 0, width: 375, height: 812 });
  expect(await dialog.locator('input').first().evaluate(e => getComputedStyle(e).fontSize)).toBe('16px');
  expect(await noSideScroll(page)).toBe(true);
});

test('NW-43: at desktop widths nothing of the phone layout shows', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?study=1&subject=Ocean%20tides');
  await expect(page.locator('.panel')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Details' })).toHaveCount(0);
  await expect(page.locator('.divider[role=separator]')).toBeVisible();
  // 56 px and its bottom line, as before.
  expect((await page.locator('header').boundingBox())!.height).toBe(57);
});
