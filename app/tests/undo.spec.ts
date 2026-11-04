import { test, expect } from '@playwright/test';

const toast = (page: import('@playwright/test').Page) => page.locator('.toast');
/** The key goes to the page, not a text field. */
const press = async (page: import('@playwright/test').Page, keys: string) => { await page.locator('body').click({ position: { x: 2, y: 200 } }); await page.keyboard.press(keys); };

test('RS-60: Ctrl+Z undoes a dismiss and a generation, Ctrl+Y brings them back, Ctrl+Shift+Z too', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?study=1&subject=Ocean%20tides');
  const panel = page.locator('.panel');
  const child = panel.getByRole('button', { name: 'Mechanism 1', exact: false });
  await expect(child).toBeVisible();
  await child.click();
  await panel.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await expect(panel.getByText('Dismissed. It will not be proposed again.')).toBeVisible();

  await press(page, 'Control+z');
  await expect(toast(page)).toContainText('Undone');
  await expect(panel.getByRole('button', { name: 'Dismiss', exact: true })).toBeVisible();
  await press(page, 'Control+y');
  await expect(panel.getByText('Dismissed. It will not be proposed again.')).toBeVisible();
  await press(page, 'Control+z');
  await press(page, 'Control+Shift+z');
  await expect(panel.getByText('Dismissed. It will not be proposed again.')).toBeVisible();
  await press(page, 'Control+z');

  await panel.getByRole('button', { name: 'Light it up', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Test me', exact: true })).toBeEnabled();
  await press(page, 'Control+z');
  await expect(panel.getByRole('button', { name: 'Light it up', exact: true })).toBeVisible();
  await press(page, 'Control+y');
  await expect(panel.getByRole('button', { name: 'Test me', exact: true })).toBeEnabled();
  expect(errors).toEqual([]);
});

test('RS-60: the undone state is what is saved, and it survives a restart', async ({ page }) => {
  await page.goto('/?study=1&subject=Ocean%20tides');
  const panel = page.locator('.panel');
  await panel.getByRole('button', { name: 'Edit explanation', exact: true }).click();
  await panel.getByRole('textbox', { name: 'Edit explanation', exact: true }).fill('My own words.');
  await panel.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(panel.getByText('My own words.', { exact: true })).toBeVisible();
  const saved = () => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('lantern.subject.')).map(k => localStorage.getItem(k)).join(''));
  await expect.poll(saved).toContain('My own words.');
  await press(page, 'Control+z');
  await expect(panel.getByText('My own words.', { exact: true })).toBeHidden();
  await expect.poll(saved).not.toContain('My own words.');
  await page.goto('/?study=1&resume=1');
  await expect(panel.getByRole('button', { name: 'Edit explanation', exact: true })).toBeVisible();
  await expect(panel.getByText('My own words.', { exact: true })).toBeHidden();
  // RS-62: the steps are for the session only.
  await press(page, 'Control+z');
  await expect(toast(page)).toContainText('Nothing to undo');
});

test('RS-65: a text field keeps its own Ctrl+Z, and the graph is left alone', async ({ page }) => {
  await page.goto('/?study=1&subject=Ocean%20tides');
  const panel = page.locator('.panel');
  const child = panel.getByRole('button', { name: 'Mechanism 1', exact: false });
  await child.click();
  await panel.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await panel.getByRole('button', { name: 'Restore', exact: true }).click();
  await panel.getByRole('button', { name: 'Light it up', exact: true }).click();
  const composer = panel.getByRole('textbox', { name: 'Ask about this, or answer the tutor… (Ctrl+Enter to send)' });
  await composer.click(); await page.keyboard.type('hello');
  await page.keyboard.press('Control+z');
  // The browser decides how much typing one undo takes back; what matters is that the field undid it, not the frame.
  await expect(composer).not.toHaveValue('hello');
  await expect(toast(page)).toHaveCount(0);
  await expect(panel.getByRole('button', { name: 'Test me', exact: true })).toBeVisible();
});

test('RS-65: no undo while a generation runs', async ({ page }) => {
  await page.goto('/?study=1&subject=Ocean%20tides&delay=200');
  const panel = page.locator('.panel');
  await expect(toast(page)).toHaveCount(0);
  await press(page, 'Control+z');
  await expect(toast(page)).toContainText('Finish or cancel the running generation first');
  await expect(panel.getByRole('button', { name: 'Mechanism 1', exact: false })).toBeVisible({ timeout: 30_000 });
});

test('RS-64: in Choose, undoing a choice puts the status back and leaves the file valid', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { const s = JSON.parse(localStorage.getItem('lantern.settings') ?? '{}'); s.ui = { ...(s.ui ?? {}), lastRoom: 'choose' }; localStorage.setItem('lantern.settings', JSON.stringify(s)); });
  await page.goto('/?chooseRoom&study=1&subject=3D%20printer');
  await expect(page.locator('html')).toHaveAttribute('data-room', 'choose');
  const panel = page.locator('.panel'), node = (title: RegExp) => page.locator('.graph .node', { hasText: title });
  await expect(node(/Enclosed printers/)).toBeVisible(); await expect(page.locator('.rail .rec')).toBeEnabled();
  await node(/Enclosed printers/).dispatchEvent('click');
  await panel.getByRole('button', { name: 'Find products', exact: true }).click();
  await expect(node(/Printer A/)).toBeVisible();
  await node(/Printer A/).dispatchEvent('click');
  await panel.getByRole('button', { name: 'Shortlist', exact: true }).click();
  await panel.getByRole('button', { name: 'Choose', exact: true }).click();
  const unchoose = panel.getByRole('button', { name: 'Un-choose', exact: true }), choose = panel.getByRole('button', { name: 'Choose', exact: true });
  await expect(unchoose).toBeVisible();
  await expect(panel.locator('.meta')).toContainText('chosen');
  await press(page, 'Control+z');
  await expect(toast(page)).toContainText('Undone');
  await expect(choose).toBeVisible();
  await press(page, 'Control+y');
  await expect(unchoose).toBeVisible();
  await expect(page.locator('.banner.error')).toHaveCount(0);
  expect(errors).toEqual([]);
});
