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
});
