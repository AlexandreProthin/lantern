import { test, expect } from '@playwright/test';
import { newLearnSubject } from '../src/rooms/learn/rules';

// RS-12, RS-15, RS-18, RS-20, RS-25, GV-76: the accepted top bar (agent_design/top-bar, r005-02).
const plates = newLearnSubject('Plate tectonics'), bread = newLearnSubject('Why bread rises');
test.beforeEach(async ({ page }) => {
  await page.addInitScript(subjects => { if (localStorage.getItem('lantern.seeded')) return; for (const s of subjects) localStorage.setItem(`lantern.subject.${s.id}`, JSON.stringify(s)); localStorage.setItem('lantern.seeded', '1'); }, [plates, bread]);
});
const field = (page: import('@playwright/test').Page) => page.locator('header .subject-field');
const panel = (page: import('@playwright/test').Page) => page.locator('.field-panel');

test('RS-12/RS-15: the field opens one panel; Esc, a second click and a press outside close it', async ({ page }) => {
  await page.goto('/');
  await expect(field(page)).toContainText('Open a subject…');
  await field(page).click();
  await expect(panel(page)).toBeVisible();
  // No subject open: only the palette shows, its filter focused.
  await expect(panel(page).locator('.subject-menu')).toHaveCount(0);
  await expect(panel(page).getByRole('combobox')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(panel(page)).toHaveCount(0);
  await field(page).click(); await expect(panel(page)).toBeVisible();
  await field(page).click(); await expect(panel(page)).toHaveCount(0);
  await field(page).click(); await expect(panel(page)).toBeVisible();
  await page.mouse.click(600, 600); await expect(panel(page)).toHaveCount(0);
});

test('GV-76/RS-15: Ctrl+K from a text field; the palette filters, arrows move, Enter opens', async ({ page }) => {
  await page.goto('/');
  const welcome = page.getByRole('textbox', { name: 'What do you want to learn?' });
  await welcome.focus(); await welcome.fill('draft');
  await page.keyboard.press('Control+k');
  await expect(panel(page)).toBeVisible();
  const options = panel(page).getByRole('option');
  await expect(options).toHaveText([/Why bread rises|Plate tectonics/, /Why bread rises|Plate tectonics/, /Learn/, /Choose/, /Settings/]);
  await page.keyboard.type('pla');
  await expect(options).toHaveText(['Plate tectonics']);
  await page.keyboard.press('Control+k'); await expect(panel(page)).toHaveCount(0);
  await expect(welcome).toBeFocused();
  // Arrow keys move through the rows; Enter opens the selection.
  await page.keyboard.press('Control+k'); await page.keyboard.type('e');
  await page.keyboard.press('ArrowDown');
  const selected = panel(page).locator('[role=option][aria-selected=true]');
  const label = (await selected.locator('.label').textContent())!;
  await page.keyboard.press('Enter');
  await expect(panel(page)).toHaveCount(0);
  if (label === 'Settings') await expect(page.getByRole('dialog')).toBeVisible();
  else if (label === 'Choose') await expect(page.locator('html')).toHaveAttribute('data-room', 'choose');
  else if (label !== 'Learn') await expect(field(page).locator('.title')).toHaveText(label);
});

test('RS-15: the subject part renames in place; an empty title is rejected, Esc cancels', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k'); await page.keyboard.type('bread'); await page.keyboard.press('Enter');
  await expect(field(page).locator('.title')).toHaveText('Why bread rises');
  await expect(page.locator('header nav').getByRole('button', { name: 'Study', exact: true })).toHaveAttribute('aria-current', 'page');
  await field(page).click();
  const title = panel(page).locator('.subject-menu').getByRole('textbox', { name: 'Title', exact: true });
  await title.fill(''); await title.press('Enter');
  await expect(panel(page).getByRole('alert')).toHaveText('A title cannot be empty.');
  await title.fill('Why dough rises'); await title.press('Escape');
  await expect(title).toHaveValue('Why bread rises'); await expect(panel(page)).toBeVisible();
  await title.fill('Why dough rises'); await title.press('Enter');
  await expect(field(page).locator('.title')).toHaveText('Why dough rises');
  // The palette no longer lists the open subject, and lists the others.
  await expect(panel(page).getByRole('option', { name: /Plate tectonics/ })).toHaveCount(1);
  await expect(panel(page).getByRole('option', { name: /dough/ })).toHaveCount(0);
});

test('RS-20: spaces are glyph and word, the current one marked by an underline and a dot', async ({ page }) => {
  await page.goto('/');
  const nav = page.locator('header nav');
  await expect(nav.locator('.space')).toHaveCount(3);
  await expect(nav.locator('.word')).toHaveText(['Welcome', 'Study', 'Gallery']);
  const marker = page.locator('header .marker'), current = () => nav.locator('[aria-current=page]');
  const under = async () => { const m = (await marker.boundingBox())!, c = (await current().boundingBox())!; return m.x > c.x && m.x + m.width < c.x + c.width; };
  await expect.poll(under).toBe(true);
  await page.keyboard.press('Control+3');
  await expect(current()).toHaveAttribute('aria-label', 'Gallery');
  await expect.poll(under).toBe(true);
});

test('RS-18: at 1024 px the words fold, the stats hide, the field narrows; mark, capsule and field stay', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 });
  await page.goto('/?study=1&subject=Ocean%20tides');
  await expect(page.locator('.panel').getByRole('button', { name: 'Test me', exact: true })).toBeEnabled();
  await expect(page.locator('header nav')).toHaveClass(/folded/);
  await expect(page.locator('header .stats')).toHaveClass(/folded/);
  await expect.poll(async () => Math.round((await field(page).boundingBox())!.width)).toBe(Math.round(1024 * .28));
  for (const part of ['.mark', '.capsule', '.subject-field']) await expect(page.locator(`header ${part}`)).toBeVisible();
  await expect(page.locator('header .room')).toHaveText('Learn');
  await page.setViewportSize({ width: 1600, height: 900 });
  await expect(page.locator('header nav')).not.toHaveClass(/folded/);
  await expect(page.locator('header .stats')).not.toHaveClass(/folded/);
  await expect(page.locator('header .stats')).toHaveAttribute('title', / in \/ .* out/);
});

test('RS-25: the field shows a pulsing dot while a generation runs', async ({ page }) => {
  await page.goto('/?study=1&subject=Ocean%20tides&delay=400');
  await expect(field(page).locator('.busy-dot')).toBeVisible();
  await expect(field(page).locator('.busy-dot')).toHaveCount(0, { timeout: 15000 });
});
