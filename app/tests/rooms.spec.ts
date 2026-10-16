import { test, expect } from '@playwright/test';
import { createSubject } from '../src/core/model';
import { newLearnSubject } from '../src/rooms/learn/rules';

// RS-4/5/10/12/23, SE-12, DM-1, ST-6: the frame with one room (?singleRoom), and with Choose and the development-only sample room.
const tides = newLearnSubject('Tides');
const printer = createSubject('Printer', 'sample', { model: 'opus', effort: 'medium', data: {}, root: { kind: 'subject', state: 'open' } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(subjects => { for (const s of subjects) localStorage.setItem(`lantern.subject.${s.id}`, JSON.stringify(s)); }, [tides, printer]);
});

test('RS-5: with Learn alone there is no room menu, Ctrl+Shift+2 does nothing, and other rooms’ subjects stay out', async ({ page }) => {
  await page.goto('/?singleRoom');
  await expect(page.locator('header .room')).toHaveText('Learn');
  await expect(page.locator('header').getByRole('button', { name: 'Learn' })).toHaveCount(0);
  await page.keyboard.press('Control+Shift+2'); await expect(page.locator('html')).toHaveAttribute('data-room', 'learn');
  await page.keyboard.press('Control+3');
  await expect(page.locator('.grid').getByRole('option')).toHaveCount(1);
  await expect(page.getByRole('option', { name: 'Tides', exact: true })).toBeVisible();
});

test('RS-12/23/10: the room menu and Ctrl+Shift switch rooms; each keeps its subjects, open subject and settings', async ({ page }) => {
  await page.goto('/?sampleRoom');
  const chip = page.locator('header').getByRole('button', { name: 'Learn', exact: true });
  await chip.click();
  const menu = page.getByRole('menu', { name: 'Rooms' });
  await expect(menu.getByRole('menuitemradio')).toHaveText(['Learn', 'Choose', 'Sample']);
  await expect(menu.getByRole('menuitemradio', { name: 'Learn' })).toHaveAttribute('aria-checked', 'true');
  // Learn's Gallery lists only Learn subjects; open Tides in Study.
  await page.keyboard.press('Escape'); await expect(menu).toHaveCount(0);
  await page.keyboard.press('Control+3'); await expect(page.locator('.grid').getByRole('option')).toHaveCount(1);
  await page.getByRole('option', { name: 'Tides', exact: true }).dblclick();
  await expect(page.locator('header .subject')).toHaveText('Tides');
  // The menu opens the sample room on its Welcome, with its palette and only its subjects.
  await chip.click(); await page.getByRole('menuitemradio', { name: 'Sample' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-room', 'sample');
  await expect(page.locator('header .room')).toHaveText('Sample');
  await expect(page.getByRole('list', { name: 'Sample subjects' }).getByRole('listitem')).toHaveText(['Printer']);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim())).toBe('#4fc1c0');
  // Ctrl+Shift+1 returns to Learn's Welcome; Study still shows the subject Learn had open.
  await page.keyboard.press('Control+Shift+1');
  await expect(page.locator('html')).toHaveAttribute('data-room', 'learn');
  await expect(page.locator('header nav').getByRole('button', { name: 'Welcome', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Control+2'); await expect(page.locator('header .subject')).toHaveText('Tides');
  // SE-12: one settings submenu per room.
  await page.locator('header').getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Sample', exact: true }).click();
  await dialog.getByRole('textbox', { name: 'Sample note' }).fill('kept'); await dialog.getByRole('textbox', { name: 'Sample note' }).blur();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings')!).sample?.note)).toBe('kept');
  await dialog.getByRole('button', { name: 'Learn', exact: true }).click();
  await expect(dialog.getByText('Applies to new subjects.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  // RS-10: the app reopens the room it was closed in, on its Welcome.
  await page.keyboard.press('Control+Shift+3'); await expect(page.locator('html')).toHaveAttribute('data-room', 'sample');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings')!).ui.lastRoom)).toBe('sample');
  await page.reload();
  await expect(page.locator('header .room')).toHaveText('Sample');
  await expect(page.getByRole('heading', { name: 'Sample room' })).toBeVisible();
  // Without the sample room registered, a stored unknown room falls back to Learn.
  await page.goto('/?singleRoom'); await expect(page.locator('html')).toHaveAttribute('data-room', 'learn');
});
