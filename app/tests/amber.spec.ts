import { test, expect } from '@playwright/test';

// CO-40 to CO-49, GV-76: Ask Amber's box, before Amber is drawn (v0.4.0 slice 2), with Amber's fake provider (IP-71).
const box = (page: import('@playwright/test').Page) => page.getByRole('dialog', { name: 'Ask Amber' });

test('CO-41/42/44/47: Ctrl+J opens the box with its field focused; an answer streams after thinking; a follow-up; Esc forgets', async ({ page }) => {
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
