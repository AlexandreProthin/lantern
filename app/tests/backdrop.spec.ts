import { test, expect, type Page } from '@playwright/test';
/** Sum of r+g+b over a 9×9 box of the backdrop's light canvas, centred on (x, y) in CSS pixels. */
const glow = (page: Page, x: number, y: number) => page.evaluate(([x, y]) => {
  const haze = document.querySelector<HTMLCanvasElement>('[data-testid=backdrop] canvas')!;
  const d = haze.getContext('2d')!.getImageData(Math.round(x) - 4, Math.round(y) - 4, 9, 9).data;
  let sum = 0; for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2]; return sum / 81;
}, [x, y]);
const centre = async (page: Page, title: string) => {
  const box = (await page.locator('.node', { hasText: title }).locator('.disc').boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
};

test('RS-34: the backdrop drifts, warms where a node is lit, and the surfaces are glass', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?study=1&subject=Backdrop');
  const panel = page.locator('.panel');
  await expect(panel.getByRole('button', { name: 'Mechanism 1', exact: false })).toBeVisible();
  await expect(page.locator('[data-testid=backdrop]')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-backdrop', 'on');
  // It moves on its own.
  const before = await glow(page, 300, 300); await page.waitForTimeout(1500);
  expect(await glow(page, 300, 300)).not.toBe(before);
  // Glass: translucent, blurred surfaces over it.
  const header = await page.locator('header').first().evaluate(e => getComputedStyle(e).backdropFilter);
  expect(header).toContain('blur(20px)');
  const panelBg = await panel.evaluate(e => getComputedStyle(e).backgroundColor);
  expect(panelBg).toMatch(/rgba|color\(srgb .* \/ 0\.55\)|oklab/);
  // A node that becomes lit warms the backdrop at its own position, not elsewhere.
  await panel.getByRole('button', { name: 'Mechanism 1', exact: false }).click();
  await page.waitForTimeout(800);
  const at = await centre(page, 'Mechanism 1'), control = { x: 20, y: 120 };
  const [node0, control0] = [await glow(page, at.x, at.y), await glow(page, control.x, control.y)];
  await panel.getByRole('button', { name: 'Light it up', exact: true }).click();
  await expect(page.locator('.node', { hasText: 'Mechanism 1' })).toHaveAttribute('data-state', 'lit');
  await page.waitForTimeout(1400);
  const warmed = (await glow(page, at.x, at.y)) - node0, drift = (await glow(page, control.x, control.y)) - control0;
  expect(warmed - drift).toBeGreaterThan(8);
  expect(errors).toEqual([]);
});

test('RS-34: a still frame in reduced motion, and Appearance → Backdrop off removes it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?study=1&subject=Still');
  await expect(page.locator('.panel').getByRole('button', { name: 'Mechanism 1', exact: false })).toBeVisible();
  await expect(page.locator('[data-testid=backdrop]')).toHaveCount(1);
  const first = await glow(page, 300, 300); await page.waitForTimeout(1200);
  expect(await glow(page, 300, 300)).toBe(first);
  expect(first).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Appearance', exact: true }).click();
  const box = dialog.getByRole('checkbox', { name: 'Backdrop: slow lights behind the spaces' });
  await expect(box).toBeChecked();
  await box.uncheck();
  await expect(page.locator('[data-testid=backdrop]')).toHaveCount(0);
  await expect(page.locator('html')).toHaveAttribute('data-backdrop', 'off');
  expect(await page.locator('header').first().evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(23, 33, 50)');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings')!).appearance.backdrop)).toBe(false);
  await page.reload();
  await expect(page.locator('.panel').getByRole('button', { name: 'Mechanism 1', exact: false })).toBeVisible();
  await expect(page.locator('[data-testid=backdrop]')).toHaveCount(0);
});

/** Red share minus blue share of the light above the background, over the whole light canvas. */
const warmth = (page: Page) => page.evaluate(() => {
  const haze = document.querySelector<HTMLCanvasElement>('[data-testid=backdrop] canvas')!;
  const d = haze.getContext('2d')!.getImageData(0, 0, haze.width, haze.height).data;
  let r = 0, b = 0; for (let i = 0; i < d.length; i += 16) { r += Math.max(0, d[i] - 16); b += Math.max(0, d[i + 2] - 39); }
  return (r - b) / (r + b || 1);
});

test('RS-34: a room switch repaints the backdrop in the new room’s colours, both ways', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-testid=backdrop]')).toHaveCount(1);
  await expect(page.locator('html')).toHaveAttribute('data-room', 'learn');
  await expect.poll(() => warmth(page)).toBeGreaterThan(0);
  const chip = page.locator('header').getByRole('button', { name: 'Learn', exact: true });
  await chip.click(); await page.getByRole('menuitemradio', { name: 'Choose' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-room', 'choose');
  await expect.poll(() => warmth(page)).toBeLessThan(0);
  await page.locator('header').getByRole('button', { name: 'Choose', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Learn' }).click();
  await expect.poll(() => warmth(page)).toBeGreaterThan(0);
});
