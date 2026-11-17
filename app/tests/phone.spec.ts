import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PHONES, bigMap, chooseBoard, seed } from './phone-fixtures';
// NW-40..43: the phone layout, below 720 px. Desktop widths keep the split.
const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
type Box = { x: number; y: number; width: number; height: number };
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
/** Every visible box of a selector. */
const boxes = (page: Page, selector: string) => page.locator(selector).evaluateAll(els => els.map(e => e.getBoundingClientRect()).filter(r => r.width && r.height).map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height })));
const appVersion = JSON.parse(readFileSync('package.json', 'utf8')).version as string;
/** Amber has already greeted this version: no launch greeting over the page. */
const greeted = (page: Page) => page.addInitScript(v => { if (!localStorage.getItem('lantern.companion')) localStorage.setItem('lantern.companion', JSON.stringify({ spots: {}, seenTips: [], lastVersion: v })); }, appVersion);

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

// The mobile review (2026-11-18), measured at 390 × 844 and 360 × 740 with touch.
for (const size of PHONES) test.describe(`a ${size.width} × ${size.height} phone with touch`, () => {
  test.use({ viewport: size, hasTouch: true, isMobile: true });
  const headerBottom = async (page: Page) => { const h = (await page.locator('header').boundingBox())!; return h.y + h.height; };

  test('NW-40, CO-10, CO-20: Amber rests under the header, clear of its controls and the graph tools; a tap opens a bubble that fits the screen; the sheet hides Amber', async ({ page }) => {
    await greeted(page);
    await page.goto('/?study=1&subject=Ocean%20tides');
    await settled(page);
    const amber = page.locator('button.amber');
    await expect(amber).toHaveAttribute('data-spot', 'rest-graph-right');
    const bottom = await headerBottom(page), a = (await amber.boundingBox())!;
    expect(a.y).toBeGreaterThanOrEqual(bottom);
    const tools = await boxes(page, '.graph .controls, .graph .zoom-controls, .graph .corner, .sheet-open');
    expect(tools.length).toBeGreaterThan(2);
    for (const t of tools) expect(overlap(a, t)).toBe(false);
    // Every control of the header takes its own taps.
    const free = await page.locator('header button').evaluateAll(els => els.filter(e => e.getBoundingClientRect().width).every(e => {
      const r = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }));
    expect(free).toBe(true);
    await page.touchscreen.tap(a.x + a.width / 2, a.y + a.height * .6);
    await expect(amber).toHaveAttribute('aria-expanded', 'true');
    const bubble = (await page.getByRole('dialog', { name: 'Amber' }).boundingBox())!;
    expect(bubble.x).toBeGreaterThanOrEqual(8); expect(bubble.x + bubble.width).toBeLessThanOrEqual(size.width - 8); expect(bubble.y).toBeGreaterThanOrEqual(bottom);
    for (const t of tools) expect(overlap(bubble, t)).toBe(false);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Amber' })).toHaveCount(0);
    // The panel sheet covers the graph: Amber waits out of sight, and comes back to its spot with the graph.
    await page.getByRole('button', { name: 'Details' }).tap();
    await expect(page.locator('.study .panel-side')).toBeVisible();
    await expect(amber).toHaveCount(0);
    await page.locator('.study .panel-side').getByRole('button', { name: /Graph/ }).tap();
    await expect(amber).toHaveAttribute('data-spot', 'rest-graph-right');
  });

  test('NW-40, CO-12, CO-15: held, Amber stays under the header; let go near it, it hangs from the header\'s bottom line, a spot the phone keeps apart', async ({ page }) => {
    await greeted(page);
    await page.goto('/?study=1&subject=Ocean%20tides');
    const amber = page.locator('button.amber');
    await expect(amber).toHaveAttribute('data-spot', /^rest-/);
    const bottom = await headerBottom(page), a = (await amber.boundingBox())!, x = a.x + a.width / 2, y = a.y + a.height * .6;
    await page.mouse.move(x, y); await page.mouse.down();
    for (let i = 1; i <= 12; i++) await page.mouse.move(x - 120, y - y * i / 12);
    // The rope ties 4 px under the box's top: held at the very top of the window, it still ties on the header's bottom line.
    expect((await amber.boundingBox())!.y + 4.2).toBeGreaterThanOrEqual(bottom - 1.5);
    await page.mouse.up();
    await expect(amber).toHaveAttribute('data-spot', /^hang-\d/);
    await expect(amber).toHaveAttribute('data-motion', 'still', { timeout: 10000 });
    expect((await amber.boundingBox())!.y + 4.2).toBeGreaterThanOrEqual(bottom - 1.5);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.companion') ?? '{}').spots)).toEqual({ 'learn/study:phone': expect.stringMatching(/^hang-\d/) });
  });

  test('NW-40, WG-10: Welcome\'s field shows its whole question; its button sits under it, not inside it', async ({ page }) => {
    await greeted(page);
    await page.goto('/');
    const field = page.locator('.welcome input.subj'), carry = page.getByRole('button', { name: 'Carry the lantern in' });
    await expect(field).toBeFocused();
    await expect(carry).toBeVisible();
    const fits = () => field.evaluate((input: HTMLInputElement) => {
      const cs = getComputedStyle(input), ctx = document.createElement('canvas').getContext('2d')!;
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      return ctx.measureText(input.placeholder).width <= input.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    });
    await expect.poll(fits).toBe(true);
    await expect.poll(async () => { const [f, c] = [(await field.boundingBox())!, (await carry.boundingBox())!]; return !overlap(f, c) && c.y >= f.y + f.height && c.x + c.width <= size.width; }).toBe(true);
    await field.fill('Bread');
    await expect(carry).toBeEnabled();
    expect(await noSideScroll(page)).toBe(true);
  });
});
