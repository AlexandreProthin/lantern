import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// CO-40 to CO-49, GV-76: Ask Amber, with Amber's fake provider (IP-71). With Amber off the chat opens in its own box;
// with Amber on it lives in Amber's bubble (the tests further down).
const box = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Ask Amber' });
const amberOff = (page: import('@playwright/test').Page) => page.addInitScript(() => localStorage.setItem('lantern.settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('lantern.settings') ?? '{"format":"lantern-settings/1"}'), companion: { show: false } })));

test('CO-41/42/44/47: Ctrl+J opens the box with its field focused; an answer streams after thinking; a follow-up; Esc forgets', async ({ page }) => {
  await amberOff(page);
  await page.goto('/?study=1&subject=Tides&delay=40');
  await page.locator('.panel').click();
  await page.keyboard.press('Control+j');
  const field = box(page).getByRole('textbox', { name: 'Ask Amber' });
  await expect(field).toBeFocused();
  await field.fill('Which key opens the settings?'); await field.press('Enter');
  await expect(box(page).getByRole('status')).toHaveText('Amber is thinking…');
  await expect(box(page).getByText('Press Ctrl+J anywhere to ask me, and ? for every shortcut.')).toBeVisible();
  await expect(box(page).getByRole('status')).toHaveCount(0);
  await expect(box(page)).not.toContainText('<category>');
  await field.fill('And what does this node explain?'); await field.press('Enter');
  await expect(box(page).getByText(/follow-up 2/)).toBeVisible();
  // CO-47: both calls are in Amber's own log, none in the subject's.
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('lantern.amberLog') ?? '[]'));
  expect(log.map((r: { category: string; effort: string; model: string }) => [r.category, r.effort])).toEqual([['app', 'low'], ['subject', 'low']]);
  const subject = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('lantern.subject.')).map(k => localStorage.getItem(k)!).join(''));
  expect(subject).not.toContain('Which key opens the settings?');
  // CO-44: Esc closes and forgets; Ctrl+J again starts empty.
  await page.keyboard.press('Escape'); await expect(box(page)).toHaveCount(0);
  await page.keyboard.press('Control+j'); await expect(box(page).getByText(/follow-up/)).toHaveCount(0);
  // A press outside closes it too.
  await page.locator('.panel').click({ position: { x: 20, y: 200 } }); await expect(box(page)).toHaveCount(0);
});

test('CO-49: a failure shows the fix-it message with Retry; Retry answers', async ({ page }) => {
  await amberOff(page);
  await page.goto('/?amberError=usage-limit');
  await page.keyboard.press('Control+j');
  const field = box(page).getByRole('textbox', { name: 'Ask Amber' });
  await field.fill('Hello'); await field.press('Enter');
  const alert = box(page).getByRole('alert');
  await expect(alert).toContainText('Amber could not answer.'); await expect(alert).toContainText('Your Claude usage limit was reached.');
  await alert.getByRole('button', { name: 'Retry' }).click();
  await expect(box(page).getByRole('alert')).toHaveCount(0);
  await expect(box(page).getByText('That depends on the details; here is the short version.')).toBeVisible();
});

test('CO-2, CO-41: Ctrl+J works in the Choose room and with Amber turned off', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lantern.settings', JSON.stringify({ format: 'lantern-settings/1', companion: { show: false } })));
  await page.goto('/');
  await page.keyboard.press('Control+Shift+2'); await expect(page.locator('html')).toHaveAttribute('data-room', 'choose');
  await page.keyboard.press('Control+j');
  const field = box(page).getByRole('textbox', { name: 'Ask Amber' });
  await field.fill('What is this room for?'); await field.press('Enter');
  await expect(box(page).getByText('Press Ctrl+J anywhere to ask me, and ? for every shortcut.')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(box(page)).toHaveCount(0);
  // RS-12: with Amber off, Ask is the capsule's last segment, right after settings, and opens the same box.
  const segments = page.locator('header .capsule > button, header .capsule > span > button');
  await expect(segments.last()).toHaveAccessibleName('Ask Amber');
  await expect(segments.nth(await segments.count() - 2)).toHaveAccessibleName('Settings');
  await segments.last().click();
  await expect(box(page).getByRole('textbox', { name: 'Ask Amber' })).toBeFocused();
});

test('RS-12: with Amber on, the capsule has no Ask button', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header').getByRole('button', { name: 'Settings' })).toBeVisible();
  await expect(page.locator('header').getByRole('button', { name: 'Ask Amber' })).toHaveCount(0);
});

// NP-54, CO-45: Ask Amber on a selection, in both rooms' reading panels; the same with Amber off.
async function selectInPanel(page: import('@playwright/test').Page, text: string, settled: import('@playwright/test').Locator) {
  // The intro streams and re-renders the explanation; select once it has settled.
  await expect(settled).toBeVisible();
  const paragraph = page.locator('.panel .md p', { hasText: text }).first();
  await expect(paragraph).toBeVisible();
  // Drag across the first words, as a user selects (a triple-click's last click can land on the popover).
  await page.evaluate(() => getSelection()?.removeAllRanges());
  const box = (await paragraph.boundingBox())!, y = box.y + 10;
  await page.mouse.move(box.x + 1, y); await page.mouse.down(); await page.mouse.move(box.x + 140, y, { steps: 5 }); await page.mouse.up();
  await expect(page.locator('.selection')).toBeVisible();
}
test('NP-54, CO-45: the popover\'s Ask Amber and Alt+D open a card by the selection; Ask the tutor quotes it; Esc closes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lantern.settings', JSON.stringify({ format: 'lantern-settings/1', companion: { show: false } })));
  await page.goto('/?study=1&subject=Tides');
  await selectInPanel(page, 'This subject connects', page.locator('.panel', { hasText: 'Experiment 1' }));
  await expect(page.locator('.selection').getByRole('button')).toHaveText(['Ask about this', 'Make it a node', 'Ask Amber']);
  await page.locator('.selection').getByRole('button', { name: 'Ask Amber' }).click();
  const card = page.getByRole('dialog', { name: 'Ask Amber' });
  await expect(card).toContainText('here means the part of the idea the explanation leans on');
  await expect(card.locator('q')).toContainText('This subject connects');
  await page.keyboard.press('Escape'); await expect(card).toHaveCount(0);
  // Alt+D does the same; Ask the tutor puts the quote in the composer (NP-51) and closes the card.
  await selectInPanel(page, 'This subject connects', page.locator('.panel', { hasText: 'Experiment 1' }));
  await page.keyboard.press('Alt+d');
  await expect(card).toContainText('leans on');
  await card.getByRole('button', { name: 'Ask the tutor' }).click();
  await expect(card).toHaveCount(0);
  const composer = page.locator('.panel').getByRole('textbox', { name: /^Ask about this/ });
  await expect(composer).toBeFocused(); await expect(composer).toHaveValue(/^> This subject connects/);
  const log = await page.evaluate(() => JSON.parse(localStorage.getItem('lantern.amberLog') ?? '[]'));
  expect(log.map((r: { kind: string; category: string }) => [r.kind, r.category])).toEqual([['selection', 'subject'], ['selection', 'subject']]);
});
test('NP-54: Alt+D works in the Choose room\'s Survey panel', async ({ page }) => {
  await page.addInitScript(() => { const s = JSON.parse(localStorage.getItem('lantern.settings') ?? '{}'); s.ui = { ...(s.ui ?? {}), lastRoom: 'choose' }; localStorage.setItem('lantern.settings', JSON.stringify(s)); });
  await page.goto('/?study=1&subject=3D%20printer');
  await expect(page.locator('html')).toHaveAttribute('data-room', 'choose');
  await selectInPanel(page, '3D printer builds objects', page.locator('.graph .node', { hasText: 'Print volume' }));
  await page.keyboard.press('Alt+d');
  await expect(page.getByRole('dialog', { name: 'Ask Amber' })).toContainText('leans on');
});

// GV-73, CO-2, CO-22: the ? overlay shows "What can I do here?" for the current space, in every space of both rooms.
test('GV-73: the ? overlay leads with the current space\'s guide lines', async ({ page }) => {
  const overlay = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  const check = async (key: string, first: string) => {
    await page.keyboard.press(key);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('?');
    await expect(overlay.getByRole('heading', { name: 'What can I do here?' })).toBeVisible();
    await expect(overlay.locator('.guide li').first()).toHaveText(first);
    await page.keyboard.press('?'); await expect(overlay).toHaveCount(0);
  };
  await page.goto('/?study=1&subject=Tides');
  await expect(page.locator('.graph .node', { hasText: 'Experiment 1' })).toBeVisible();
  await check('Control+1', 'Bring a subject: type it and press Enter.');
  await check('Control+2', 'Walk the graph: arrow keys; Home goes back to the root.');
  await check('Control+3', 'Move through your subjects: arrow keys; Enter opens one.');
  await page.keyboard.press('Control+Shift+2'); await expect(page.locator('html')).toHaveAttribute('data-room', 'choose');
  await check('Control+1', 'Say what you want to buy: type it and press Enter.');
  await check('Control+4', 'Move through your decisions: arrow keys; Enter opens one.');
});

// v0.4.0 slice 5: Amber drawn, hanging from the top bar (CO-10, CO-11, CO-16, CO-17, CO-20, CO-21, CO-41, CO-58, RS-12).
const amber = (page: import('@playwright/test').Page) => page.getByRole('button', { name: 'Amber', exact: true });
const bubble = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Amber', exact: true });

test('CO-10/11/20/21: Amber hangs under the bar on the right; a click opens a tip, Next tip, the guide; Esc closes; seen tips are kept', async ({ page }) => {
  await page.goto('/?study=1&subject=Tides');
  await expect(amber(page)).toBeVisible();
  const box = (await amber(page).boundingBox())!, width = page.viewportSize()!.width;
  expect(box.y).toBeGreaterThanOrEqual(56); expect(box.width).toBeGreaterThanOrEqual(64);
  expect(box.x + box.width).toBeLessThanOrEqual(width - 16); expect(box.x).toBeGreaterThan(width / 2);
  await expect(amber(page)).toHaveAttribute('data-spot', 'hang-9');
  await amber(page).click();
  await expect(bubble(page)).toContainText('Press Ctrl+J anywhere to ask me something.');
  await bubble(page).getByRole('button', { name: 'Next tip' }).click();
  await expect(bubble(page)).toContainText('Select a few words in the panel and press Alt+D');
  await bubble(page).getByRole('button', { name: 'What can I do here?' }).click();
  await expect(bubble(page).locator('.guide li').first()).toHaveText('Walk the graph: arrow keys; Home goes back to the root.');
  await page.keyboard.press('Escape'); await expect(bubble(page)).toHaveCount(0); await expect(amber(page)).toBeFocused();
  // CO-21: the two tips shown are remembered as seen (SE-50), so the next opening starts with the third.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.companion') ?? '{}').seenTips)).toEqual(['frame.ask', 'frame.define']);
  await page.reload(); await amber(page).click();
  await expect(bubble(page)).toContainText('Press ? to see every shortcut');
  // A press outside closes it too.
  await page.locator('.graph').click({ position: { x: 30, y: 30 } }); await expect(bubble(page)).toHaveCount(0);
});

test('CO-41: with Amber on, Ctrl+J opens the bubble with the Ask field focused, and the answer comes in the bubble', async ({ page }) => {
  await page.goto('/?study=1&subject=Tides');
  await page.keyboard.press('Control+j');
  const field = bubble(page).getByRole('textbox', { name: 'Ask Amber' });
  await expect(field).toBeFocused();
  await field.fill('Which key opens the settings?'); await field.press('Enter');
  await expect(bubble(page).getByText('Press Ctrl+J anywhere to ask me, and ? for every shortcut.')).toBeVisible();
  await expect(box(page)).toHaveCount(0);
  await expect(page.locator('header').getByRole('button', { name: 'Ask Amber' })).toHaveCount(0);
});

test('CO-16/58/15: the menu opens on right-click and Shift+F10; Move to… moves Amber in this space only, and it stays after a restart', async ({ page }) => {
  await page.goto('/?study=1&subject=Tides');
  await amber(page).click({ button: 'right' });
  const menu = page.getByRole('menu', { name: 'Amber' });
  await expect(menu.getByRole('menuitem')).toHaveText(['Move to…', 'Hide']);
  await expect(menu.getByRole('menuitem', { name: 'Move to…' })).toBeFocused();
  await menu.getByRole('menuitem', { name: 'Move to…' }).click();
  await expect(menu.getByRole('menuitemradio')).toHaveCount(13);
  await expect(menu.getByRole('menuitemradio', { name: 'Hanging, position 10 of 10' })).toHaveAttribute('aria-checked', 'true');
  await menu.getByRole('menuitemradio', { name: 'Hanging, position 1 of 10' }).click();
  await expect(amber(page)).toHaveAttribute('data-spot', 'hang-0');
  expect((await amber(page).boundingBox())!.x).toBeLessThan(40);
  // Another space keeps its own spot.
  await page.keyboard.press('Control+3'); await expect(amber(page)).toHaveAttribute('data-spot', 'hang-9');
  await page.keyboard.press('Control+2'); await expect(amber(page)).toHaveAttribute('data-spot', 'hang-0');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.companion') ?? '{}').spots)).toEqual({ 'learn/study': 'hang-0' });
  await page.reload(); await expect(amber(page)).toHaveAttribute('data-spot', 'hang-0');
  // Shift+F10 from the keyboard; arrows move in the menu; Esc closes it and gives focus back.
  await amber(page).focus(); await page.keyboard.press('Shift+F10');
  await expect(menu.getByRole('menuitem', { name: 'Move to…' })).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(menu.getByRole('menuitem', { name: 'Hide' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(menu).toHaveCount(0); await expect(amber(page)).toBeFocused();
});

test('CO-4, RS-12: Hide turns Amber off with a toast; the capsule gains Ask; Amber comes back from Settings', async ({ page }) => {
  await page.goto('/?study=1&subject=Tides');
  await amber(page).click({ button: 'right' });
  await page.getByRole('menu', { name: 'Amber' }).getByRole('menuitem', { name: 'Hide' }).click();
  await expect(amber(page)).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Amber is hidden. Bring it back in Settings → Companion, or right-click Ask in the top bar.' })).toBeVisible();
  await expect(page.locator('header').getByRole('button', { name: 'Ask Amber' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings')!).companion.show)).toBe(false);
  await page.reload(); await expect(page.locator('header').getByRole('button', { name: 'Ask Amber' })).toBeVisible(); await expect(amber(page)).toHaveCount(0);
  await page.locator('header').getByRole('button', { name: 'Settings' }).click();
  const dialog = page.getByRole('dialog', { name: undefined }).filter({ hasText: 'Companion' });
  await dialog.getByRole('button', { name: 'Companion', exact: true }).click();
  await dialog.getByRole('checkbox', { name: 'Show Amber' }).check();
  await page.keyboard.press('Escape');
  await expect(amber(page)).toBeVisible(); await expect(page.locator('header').getByRole('button', { name: 'Ask Amber' })).toHaveCount(0);
});

test('CO-4, RS-12: with Amber off, the Ask button’s menu brings Amber back (right-click or Shift+F10); Esc closes it', async ({ page }) => {
  await page.goto('/?study=1&subject=Tides');
  await amber(page).click({ button: 'right' });
  await page.getByRole('menu', { name: 'Amber' }).getByRole('menuitem', { name: 'Hide' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'or right-click Ask in the top bar.' })).toBeVisible();
  const ask = page.locator('header').getByRole('button', { name: 'Ask Amber' });
  // Shift+F10 opens the menu with its item focused; Esc closes it and gives focus back.
  await ask.focus(); await page.keyboard.press('Shift+F10');
  const menu = page.getByRole('menu', { name: 'Ask Amber' });
  await expect(menu.getByRole('menuitem', { name: 'Bring Amber back' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(menu).toHaveCount(0); await expect(ask).toBeFocused();
  // A press outside closes it too.
  await ask.click({ button: 'right' }); await expect(menu).toBeVisible();
  await page.mouse.click(300, 400); await expect(menu).toHaveCount(0);
  // A left click still asks.
  await ask.click(); await expect(box(page)).toBeVisible(); await page.keyboard.press('Escape');
  await ask.click({ button: 'right' }); await menu.getByRole('menuitem', { name: 'Bring Amber back' }).click();
  await expect(amber(page)).toBeVisible(); await expect(ask).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'Amber is hidden' })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings')!).companion.show)).toBe(true);
  await page.reload(); await expect(amber(page)).toBeVisible();
});

test('CO-17: clicks beside Amber\'s drawn shape reach what is underneath; popovers draw above it', async ({ page }) => {
  await page.goto('/?study=1&subject=Tides');
  const box = (await amber(page).boundingBox())!;
  // The box's top-left corner is outside the lantern: what is there is not Amber.
  const corner = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('button.amber'), [box.x + 2, box.y + box.height - 3]);
  expect(corner).toBe(false);
  const body = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('button.amber'), [box.x + box.width / 2, box.y + box.height * .6]);
  expect(body).toBe(true);
  // The subject field's panel (Ctrl+K) opens over Amber.
  await page.keyboard.press('Control+k');
  const z = await page.evaluate(() => { const p = document.querySelector('.field-panel, [role=dialog]'); return p ? Number(getComputedStyle(p).zIndex) || 0 : -1; });
  expect(z).toBeGreaterThan(1);
});

// v0.4.0 slice 6: moving Amber (CO-12 to CO-16, CO-56).
async function dragAmber(page: import('@playwright/test').Page, to: { x: number; y: number }, during?: () => Promise<void>) {
  const box = (await amber(page).boundingBox())!, from = { x: box.x + box.width / 2, y: box.y + box.height * .6 };
  await page.mouse.move(from.x, from.y); await page.mouse.down();
  await page.mouse.move(from.x + (to.x - from.x) / 2, from.y + (to.y - from.y) / 2, { steps: 12 });
  await page.mouse.move(to.x, to.y, { steps: 12 });
  await during?.();
  await page.mouse.up();
}
test('CO-13/14/15: dropped low, Amber falls to the nearest resting spot of Study, stands there, and is there after a restart', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('/?study=1&subject=Tides');
  await expect(page.locator('.graph .node', { hasText: 'Experiment 1' })).toBeVisible();
  await dragAmber(page, { x: 120, y: 520 }, async () => {
    // CO-14: while held, every spot is hinted: ten along the bar and Study's three rests; lower down there is no rope.
    await expect(page.locator('svg.hints circle')).toHaveCount(10);
    await expect(page.locator('svg.hints ellipse')).toHaveCount(3);
    await expect(page.locator('svg.hints .lit')).toHaveCount(1);
    await expect(page.locator('svg.rope')).toHaveCount(0);
  });
  await expect(amber(page)).toHaveAttribute('data-motion', 'flight');
  await expect(amber(page)).toHaveAttribute('data-motion', 'still');
  await expect(amber(page)).toHaveAttribute('data-spot', 'rest-graph-left');
  const box = (await amber(page).boundingBox())!, graph = (await page.locator('.graph-side').boundingBox())!;
  expect(box.x).toBeCloseTo(graph.x + 16, 0); expect(box.y + box.height).toBeLessThan(graph.y + graph.height - 100);
  await expect(page.locator('svg.hints')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.companion') ?? '{}').spots?.['learn/study'])).toBe('rest-graph-left');
  await page.reload(); await expect(amber(page)).toHaveAttribute('data-spot', 'rest-graph-left');
  // The bubble opens above a resting Amber.
  await amber(page).click();
  const b = (await bubble(page).boundingBox())!; expect(b.y + b.height).toBeLessThanOrEqual((await amber(page).boundingBox())!.y);
});
test('CO-12: held in the top quarter, Amber is on a bowed rope that follows; let go, it swings and settles hanging there', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('/?study=1&subject=Tides');
  await dragAmber(page, { x: 520, y: 150 }, async () => {
    const d = await page.locator('svg.rope path').getAttribute('d');
    expect(d).toContain('Q');
  });
  await expect(amber(page)).toHaveAttribute('data-motion', 'swing');
  const tilts: number[] = [];
  for (let i = 0; i < 6; i++) { tilts.push(Number((await amber(page).evaluate(b => (b as HTMLElement).style.transform)).replace(/[^-0-9.]/g, '') || 0)); await page.waitForTimeout(120); }
  expect(tilts.some(t => Math.abs(t) > .5)).toBe(true);
  await expect(amber(page)).toHaveAttribute('data-motion', 'still', { timeout: 8000 });
  const spot = await amber(page).getAttribute('data-spot');
  expect(spot).toMatch(/^hang-[3-5](:\d+)?$/);
  // Hanging under the tie, upright, on a straight rope from the bar.
  const box = (await amber(page).boundingBox())!, rope = await page.locator('svg.rope path').getAttribute('d');
  expect(rope).toMatch(/^M[\d.]+ 56 L[\d.]+ [\d.]+$/); expect(box.y).toBeGreaterThan(56);
});
test('CO-56: with reduced motion a drop goes straight to the spot: no swing, flight or fall', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('/?study=1&subject=Tides');
  await expect(page.locator('.graph .node', { hasText: 'Experiment 1' })).toBeVisible();
  await dragAmber(page, { x: 900, y: 540 });
  await expect(amber(page)).toHaveAttribute('data-motion', 'still');
  await expect(amber(page)).toHaveAttribute('data-spot', 'rest-panel-right');
  await dragAmber(page, { x: 300, y: 140 });
  await expect(amber(page)).toHaveAttribute('data-motion', 'still'); await expect(amber(page)).toHaveAttribute('data-spot', /^hang-/);
});
test('CO-16: Move to… lists the bar and this space\'s rests; Esc while holding Amber puts it back', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('/?study=1&subject=Tides');
  await expect(page.locator('.graph .node', { hasText: 'Experiment 1' })).toBeVisible();
  await amber(page).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Move to…' }).click();
  const items = page.getByRole('menu', { name: 'Amber' }).getByRole('menuitemradio');
  await expect(items).toHaveCount(13);
  await expect(items.nth(12)).toHaveText('Bottom right of the reading panel');
  await items.nth(12).click();
  await expect(amber(page)).toHaveAttribute('data-spot', 'rest-panel-right');
  // Welcome has no rests of its own: the space's two bottom corners.
  await page.keyboard.press('Control+1'); await amber(page).click({ button: 'right' }); await page.getByRole('menuitem', { name: 'Move to…' }).click();
  await expect(items.nth(10)).toHaveText('Bottom left'); await expect(items).toHaveCount(12);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  const before = await amber(page).getAttribute('data-spot');
  const box = (await amber(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * .6); await page.mouse.down(); await page.mouse.move(400, 400, { steps: 8 });
  await expect(amber(page)).toHaveAttribute('data-motion', 'drag');
  await page.keyboard.press('Escape'); await page.mouse.up();
  await expect(amber(page)).toHaveAttribute('data-motion', 'still'); await expect(amber(page)).toHaveAttribute('data-spot', before!);
});

// v0.4.0 slice 7: gestures and the new motions (CO-50 to CO-57).
const drawing = (page: import('@playwright/test').Page) => amber(page).evaluate(b => b.querySelector('svg')!.innerHTML);
test('CO-50: it appears hanging with suspension; hover plays attention, a click curiosity as the bubble opens', async ({ page }) => {
  await page.goto('/');
  await expect(amber(page)).toHaveAttribute('data-act', '3');
  await expect(amber(page)).toHaveAttribute('data-act', '', { timeout: 6000 });
  const box = (await amber(page).boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * .6);
  await expect(amber(page)).toHaveAttribute('data-act', '0');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * .6);
  await expect(amber(page)).toHaveAttribute('data-act', '1'); await expect(bubble(page)).toBeVisible();
});
test('CO-50: at a bottom spot it appears with a few steps in', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lantern.companion', JSON.stringify({ spots: { 'learn/welcome': 'rest-right' }, seenTips: [] })));
  await page.goto('/');
  await expect(amber(page)).toHaveAttribute('data-spot', 'rest-right');
  await expect(amber(page)).toHaveAttribute('data-act', '2');
});
test('CO-52/53: the flame lives on Welcome; in Study Amber is still until hovered', async ({ page }) => {
  await page.goto('/');
  await expect(amber(page)).toHaveAttribute('data-act', '', { timeout: 6000 });
  const a = await drawing(page); await page.waitForTimeout(300); expect(await drawing(page)).not.toBe(a);
  await page.goto('/?study=1&subject=Tides');
  await expect(amber(page)).toHaveAttribute('data-act', '', { timeout: 6000 });
  await page.mouse.move(10, 700);
  await page.waitForTimeout(400);
  const b = await drawing(page); await page.waitForTimeout(400); expect(await drawing(page)).toBe(b);
  const box = (await amber(page).boundingBox())!; await page.mouse.move(box.x + box.width / 2, box.y + box.height * .6);
  await page.waitForTimeout(200); const c = await drawing(page); await page.waitForTimeout(300); expect(await drawing(page)).not.toBe(c);
});
test('CO-51: the eyes turn toward a pointer that comes close, and back when it leaves', async ({ page }) => {
  await page.goto('/?study=1&subject=Tides');
  await expect(amber(page)).toHaveAttribute('data-act', '', { timeout: 6000 });
  const eyes = () => amber(page).evaluate(b => Number(b.querySelector('mask ellipse')!.getAttribute('cx')));
  await page.mouse.move(10, 700); await page.waitForTimeout(300);
  expect(await eyes()).toBeCloseTo(44, 1);
  const box = (await amber(page).boundingBox())!;
  await page.mouse.move(box.x - 60, box.y + box.height / 2, { steps: 5 });
  await expect.poll(eyes).toBeLessThan(42);
  await page.mouse.move(10, 700, { steps: 5 });
  await expect.poll(eyes).toBeCloseTo(44, 1);
});
test('CO-42, CO-54: Amber thinks while its answer is on the way', async ({ page }) => {
  await page.goto('/?study=1&subject=Tides&delay=120');
  await expect(amber(page)).toHaveAttribute('data-act', '', { timeout: 6000 });
  await page.keyboard.press('Control+j');
  const field = bubble(page).getByRole('textbox', { name: 'Ask Amber' });
  await field.fill('What does this node explain?'); await field.press('Enter');
  await expect(bubble(page).getByRole('status')).toHaveText('Amber is thinking…');
  // Half-lidded while thinking (the identity's lid: eye height 3.2 × (1 − .85 × lid)).
  const lid = () => amber(page).evaluate(b => Number(b.querySelector('mask ellipse')!.getAttribute('ry')));
  await expect.poll(lid).toBeLessThan(2.5);
  await expect(bubble(page).getByText('The focused node explains')).toBeVisible();
  await expect.poll(lid).toBeCloseTo(3.2, 1);
});
test('CO-56: reduced motion: no gesture, a still flame, the eyes stay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(amber(page)).toHaveAttribute('data-act', '');
  const a = await drawing(page); await page.waitForTimeout(300); expect(await drawing(page)).toBe(a);
  const box = (await amber(page).boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height * .6);
  await expect(bubble(page)).toBeVisible(); await expect(amber(page)).toHaveAttribute('data-act', '');
  expect(await drawing(page)).toBe(a);
});

// The user's notes on slice 7 (2026-10-17): Amber can be caught mid-swing; after landing it folds its feet in.
test('the user, 2026-10-17: Amber can be caught while it swings and moved at once', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('/?study=1&subject=Tides');
  await expect(page.locator('.graph .node', { hasText: 'Experiment 1' })).toBeVisible();
  // A small swing (dropped almost under its tie, a little lower), so the press lands on the lantern.
  const start = (await amber(page).boundingBox())!;
  await dragAmber(page, { x: start.x + start.width / 2 + 14, y: 150 });
  await expect(amber(page)).toHaveAttribute('data-motion', 'swing');
  // Press on the lantern in the same moment the swing is checked (pointer 1 is Playwright's mouse).
  const caught = await page.evaluate(() => {
    const b = document.querySelector<HTMLElement>('button.amber')!, path = b.querySelector('.hit path')!, r = path.getBoundingClientRect();
    if (b.dataset.motion !== 'swing') return 'not swinging';
    path.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1, clientX: r.x + r.width / 2, clientY: r.y + r.height * .6 }));
    return 'pressed';
  });
  expect(caught).toBe('pressed');
  await expect(amber(page)).toHaveAttribute('data-motion', 'drag');
  await page.mouse.move(150, 500, { steps: 10 }); await page.mouse.down(); await page.mouse.up();
  await expect(amber(page)).toHaveAttribute('data-motion', 'still');
  await expect(amber(page)).toHaveAttribute('data-spot', 'rest-graph-left');
});
test('the user, 2026-10-17: landed, Amber folds its feet in and sits on its base', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 720 });
  await page.goto('/?study=1&subject=Tides');
  await expect(page.locator('.graph .node', { hasText: 'Experiment 1' })).toBeVisible();
  // Every gesture the button shows is recorded in the page, so short ones are not missed on a busy machine.
  await amber(page).evaluate(b => { const seen: string[] = []; (window as any).__acts = seen; new MutationObserver(() => seen.push((b as HTMLElement).dataset.act ?? '')).observe(b, { attributes: true, attributeFilter: ['data-act'] }); });
  await dragAmber(page, { x: 120, y: 520 });
  await expect(amber(page)).toHaveAttribute('data-spot', 'rest-graph-left');
  await expect.poll(() => page.evaluate(() => (window as any).__acts.join(' '))).toMatch(/5 100 $/);
  // No feet drawn once it sits.
  expect(await amber(page).evaluate(b => b.querySelector('svg')!.innerHTML.includes('M35 96 V'))).toBe(false);
});

// v0.4.0 slice 8: greetings and company during a generation (CO-30 to CO-36).
const says = (page: import('@playwright/test').Page) => page.getByTestId('amber-says');
const appVersion = JSON.parse(readFileSync('package.json', 'utf8')).version as string;
test('CO-30: the first launch has its own line; later launches greet from the pool, never the same line twice in a row', async ({ page }) => {
  await page.goto('/');
  await expect(says(page)).toHaveText('Hello, I’m Amber. Click me for tips, or press Ctrl+J to ask me anything.');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.companion') ?? '{}').lastVersion)).toBe(appVersion);
  const lines: string[] = [];
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.companion') ?? '{}').lastGreeting as string | undefined);
  for (let i = 0; i < 3; i++) {
    const before = await saved();
    await page.reload(); await expect(says(page)).toBeVisible(); lines.push((await says(page).textContent())!);
    await expect.poll(saved).not.toBe(before);
  }
  expect(lines[1]).not.toBe(lines[0]); expect(lines[2]).not.toBe(lines[1]);
  expect(lines.every(l => !l.includes('I’m Amber'))).toBe(true);
});
test('CO-30: the greeting fades after about 6 s; hovering it pauses the fade', async ({ page }) => {
  await page.addInitScript(v => localStorage.setItem('lantern.companion', JSON.stringify({ spots: {}, seenTips: [], lastVersion: v })), appVersion);
  await page.goto('/');
  await expect(says(page)).toBeVisible();
  await page.waitForTimeout(4500);
  await says(page).hover();
  await page.waitForTimeout(3000);
  await expect(says(page)).toBeVisible();
  await page.mouse.move(10, 700);
  await expect(says(page)).toHaveCount(0, { timeout: 4000 });
});
test('CO-31: after an update, the version, the notes kept at install (cut, then in full) and the release page link', async ({ page }) => {
  const notes = 'Amber arrives. ' + 'She hangs from the bar and keeps you company while the tutor thinks. '.repeat(8);
  await page.addInitScript(([v, n]) => localStorage.setItem('lantern.companion', JSON.stringify({ spots: {}, seenTips: [], lastVersion: '0.0.1', notes: { version: v, text: n } })), [appVersion, notes]);
  await page.goto('/');
  await expect(says(page)).toContainText(`Lantern ${appVersion} is here. What’s new:`);
  await expect(says(page).locator('.notes')).toHaveText(/…$/);
  await says(page).getByRole('button', { name: 'Show all' }).click();
  await expect(says(page).locator('.notes')).toHaveText(notes.trim());
  await expect(says(page).getByRole('button', { name: 'Full release notes ›' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.companion') ?? '{}'))).toMatchObject({ lastVersion: appVersion });
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lantern.companion')!).notes)).toBeUndefined();
});
test('CO-35/36: while a generation waits for its first words Amber works and says so; it stops when the text streams', async ({ page }) => {
  await page.addInitScript(v => localStorage.setItem('lantern.companion', JSON.stringify({ spots: {}, seenTips: [], lastVersion: v, lastGreeting: 'greet.1' })), appVersion);
  await page.goto('/?study=1&subject=Tides&delay=150');
  await expect(says(page)).toHaveText('Lighting up Tides…');
  const lid = () => amber(page).evaluate(b => Number(b.querySelector('mask ellipse')!.getAttribute('ry')));
  await expect.poll(lid).toBeLessThan(2.2);
  await expect(page.locator('.panel .md')).toContainText('This subject connects');
  await expect(says(page).filter({ hasText: 'Lighting up Tides…' })).toHaveCount(0);
});
test('CO-35: the Choose room says its own waiting line', async ({ page }) => {
  await page.addInitScript(v => { localStorage.setItem('lantern.companion', JSON.stringify({ spots: {}, seenTips: [], lastVersion: v })); const s = JSON.parse(localStorage.getItem('lantern.settings') ?? '{}'); s.ui = { ...(s.ui ?? {}), lastRoom: 'choose' }; localStorage.setItem('lantern.settings', JSON.stringify(s)); }, appVersion);
  await page.goto('/?study=1&subject=3D%20printer&delay=150');
  await expect(says(page)).toHaveText('Sizing up 3D printer…');
});
test('CO-1, CO-30: with Amber off there is no greeting and no waiting line; the busy state stays', async ({ page }) => {
  await amberOff(page);
  await page.goto('/?study=1&subject=Tides&delay=150');
  await expect(page.locator('header .busy-dot')).toBeVisible();
  await expect(says(page)).toHaveCount(0);
});
