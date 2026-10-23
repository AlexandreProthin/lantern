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

/** The screen centre of the node drawn farthest from the graph's centre: a wrong zoom pivot moves it most. */
async function farNode(page: Page) {
  return page.evaluate(() => {
    const host = document.querySelector('.graph')!.getBoundingClientRect(), cx = host.left + host.width / 2, cy = host.top + host.height / 2;
    const at = (n: Element) => { const r = n.getBoundingClientRect(); return { id: n.getAttribute('data-id')!, x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
    return [...document.querySelectorAll('.node[data-id]')].map(at).sort((a, b) => Math.hypot(b.x - cx, b.y - cy) - Math.hypot(a.x - cx, a.y - cy))[0];
  });
}
const nodeAt = (page: Page, id: string) => page.locator(`.node[data-id="${id}"]`).evaluate(n => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
const scale = (page: Page) => page.locator('.world').evaluate(w => Number(/scale\(([\d.]+)\)/.exec((w as HTMLElement).style.transform)?.[1]));
/** The layout has settled and the opening fit has finished moving the view. */
async function settled(page: Page) {
  await expect(page.locator('.graph')).toHaveAttribute('data-settled', 'true', { timeout: 45000 });
  const view = () => page.locator('.world').evaluate(w => (w as HTMLElement).style.transform);
  await expect.poll(async () => { const a = await view(); await page.waitForTimeout(400); return a === await view(); }, { timeout: 10000 }).toBe(true);
}

test.describe('on a touch screen', () => {
  // d3-zoom listens for touches only where the browser reports a touch screen.
  test.use({ hasTouch: true });
  test('NW-41: a pinch zooms around the point between the fingers', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/?study=1&subject=Ocean%20tides');
    await settled(page);
    const start = await farNode(page), k = await scale(page);
    await page.evaluate(async ({ x, y }) => {
      const host = document.querySelector('.graph')!;
      const fire = (type: string, gap: number) => {
        const ts = [new Touch({ identifier: 1, target: host, clientX: x - gap, clientY: y }), new Touch({ identifier: 2, target: host, clientX: x + gap, clientY: y })];
        const live = type === 'touchend' ? [] : ts;
        host.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: live, targetTouches: live, changedTouches: ts }));
      };
      fire('touchstart', 40);
      for (let i = 1; i <= 10; i++) { fire('touchmove', 40 + i * 2); await new Promise(r => setTimeout(r, 16)); }
      fire('touchend', 60);
    }, start);
    expect(await scale(page)).toBeCloseTo(k * 1.5, 2);
    const end = await nodeAt(page, start.id);
    expect(Math.abs(end.x - start.x)).toBeLessThan(3);
    expect(Math.abs(end.y - start.y)).toBeLessThan(3);
  });
});

test('the wheel zooms around the pointer at desktop widths', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?study=1&subject=Ocean%20tides');
  await settled(page);
  const start = await farNode(page), k = await scale(page);
  await page.mouse.move(start.x, start.y);
  await page.mouse.wheel(0, -200);
  await page.waitForTimeout(200);
  expect(await scale(page)).toBeGreaterThan(k * 1.1);
  const end = await nodeAt(page, start.id);
  expect(Math.abs(end.x - start.x)).toBeLessThan(3);
  expect(Math.abs(end.y - start.y)).toBeLessThan(3);
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
