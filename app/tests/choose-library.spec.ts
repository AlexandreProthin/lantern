import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { addChooseChild, answerNeed, chooseProduct, markBought, newChooseSubject, normalize, setState, unchooseProduct, validateChoose } from '../src/rooms/choose/rules';
import type { Subject } from '../src/core/model';

// CR-12, CR-13, CR-24, CR-90, WG-1..14, WG-51..71: the Choose room's Welcome, Gallery and Settings, in the browser build.
const locale = { country: 'FR', currency: 'EUR' };
const shots = 'test-results/library';
type Shape = 'new' | 'almost' | 'exploring-ready' | 'decided' | 'bought' | 'unchosen';
/** A Choose subject in one of the shapes the cards must draw. */
function made(title: string, createdAt: string, shape: Shape, needsNote?: string): Subject {
  const s = newChooseSubject(title, { tone: 'engineer', model: 'opus', effort: 'medium', locale, needsNote }, 'Alex'), v = s.rooms.choose;
  s.createdAt = createdAt; v.nodes[v.rootId].state = 'lit';
  const add = (kind: Parameters<typeof addChooseChild>[2]['kind'], name: string) => addChooseChild(v, v.rootId, { title: name, kind, createdBy: 'model' }).id;
  if (shape !== 'new') {
    const n1 = add('need', 'Use'), n2 = add('need', 'Who'), c1 = add('criterion', 'Volume'), c2 = add('criterion', 'Noise');
    const a = add('product', `${title} A`), b = add('product', `${title} B`);
    answerNeed(v, n1, 'figurines', 'Alex'); setState(v, c1, 'must'); setState(v, a, 'shortlisted');
    if (shape !== 'almost') { answerNeed(v, n2, 'kids', 'Alex'); setState(v, c2, 'nice'); setState(v, b, 'shortlisted'); }
    if (shape === 'decided' || shape === 'bought' || shape === 'unchosen') {
      v.nodes[a].data = { facts: [{ label: 'Price', value: '549 €', sources: [] }] };
      chooseProduct(v, a); normalize(v);
      if (shape === 'bought') markBought(v);
      if (shape === 'unchosen') unchooseProduct(v, a);
    }
  }
  validateChoose(v); return s;
}
const day = (n: number) => new Date(Date.UTC(2026, 9, 15 - n, 10)).toISOString();
const library = [
  { s: made('3D printer', day(13), 'bought', 'budget about 500 €'), opened: day(0) },
  { s: made('Sofa bed for a very small guest room that a tall adult can actually sleep on comfortably', day(6), 'decided'), opened: day(1) },
  { s: made('Headphones', day(4), 'exploring-ready'), opened: day(3) },
  { s: made('Family car', day(30), 'new'), opened: day(33) },
  { s: made('Desk lamp', day(8), 'unchosen'), opened: day(5) },
  { s: made('Espresso machine', day(9), 'almost'), opened: day(2) },
];

async function seed(page: Page, rows: typeof library, extra: Record<string, unknown> = {}) {
  await page.addInitScript(({ rows, extra }) => {
    if (localStorage.getItem('lantern.seeded')) return;
    const stored = JSON.parse(localStorage.getItem('lantern.settings') ?? '{}');
    localStorage.setItem('lantern.settings', JSON.stringify({ ...stored, choose: { country: 'FR', currency: 'EUR' }, ...extra, ui: { ...(stored.ui ?? {}), lastRoom: 'choose' } }));
    const opened: Record<string, string> = {};
    for (const r of rows) { localStorage.setItem(`lantern.subject.${r.s.id}`, JSON.stringify(r.s)); opened[r.s.id] = r.opened; }
    localStorage.setItem('lantern.lastOpenedAt', JSON.stringify(opened)); localStorage.setItem('lantern.recents', JSON.stringify(Object.keys(opened)));
    localStorage.setItem('lantern.seeded', '1');
  }, { rows, extra });
}
const errors = (page: Page) => { const list: string[] = []; page.on('pageerror', e => list.push(e.message)); return list; };
async function toGallery(page: Page, url = '/?chooseRoom') {
  await page.goto(url);
  const gallery = page.locator('header nav').getByRole('button', { name: 'Gallery', exact: true });
  await expect(gallery).toBeEnabled(); await gallery.click(); await expect(space(page)).toHaveAttribute('aria-label', 'Gallery');
}
const space = (page: Page) => page.locator('header nav button[aria-current=page]');

test('CR-12/CR-13: a choice starts from Welcome with a starter and a note, and lands in Survey', async ({ page }) => {
  const errs = errors(page);
  await seed(page, []);
  await page.goto('/?chooseRoom');
  const subject = page.getByRole('textbox', { name: 'What do you want to choose?' }), needs = page.getByRole('textbox', { name: 'Your budget and needs, optional' });
  await expect(page.locator('.lede')).toContainText('Bring something you want to choose');
  await expect(page.getByRole('button', { name: /Suggest/ })).toHaveCount(0);
  await expect(page.locator('.example')).toHaveText('For example, a 3D printer, a family car, or headphones for flights. Shift+Enter adds your budget and needs.');
  await expect(subject).toBeFocused(); await expect(needs).toBeHidden();
  await subject.fill('Standing desk'); await subject.press('Shift+Enter'); await expect(needs).toBeFocused();
  await expect(page.getByRole('button', { name: /^(Budget|Who it|What for|Where it goes|Already have|Must avoid)/ })).toHaveCount(6);
  // A starter inserts only its words at the cursor, after ", " once text precedes it (the user writes the answer).
  await page.getByRole('button', { name: 'Budget (€)' }).click();
  await expect(needs).toHaveValue('budget about  €'); await expect(needs).toBeFocused();
  await page.keyboard.type('450');
  await expect(needs).toHaveValue('budget about 450 €');
  await needs.press('End');
  await page.getByRole('button', { name: 'Who it’s for' }).click();
  await expect(needs).toHaveValue('budget about 450 €, it’s for ');
  await page.keyboard.type('me, 1.90 m');
  await page.screenshot({ path: `${shots}/welcome-needs.png`, fullPage: true, animations: 'disabled' });
  // The needs messages are worded for needs.
  await needs.fill('x'.repeat(520));
  await expect(page.locator('.why')).toHaveText('The needs are 20 characters over the 500 limit.');
  await expect(page.getByRole('button', { name: 'Carry the lantern in' })).toBeDisabled();
  await needs.fill('budget about 450 €, it’s for me, 1.90 m');
  await expect(page.getByRole('button', { name: 'Carry the lantern in' })).toBeEnabled();
  await needs.press('Enter');
  await expect(space(page)).toHaveAttribute('aria-label', 'Survey');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('lantern.subject.'))!)!));
  expect(stored.title).toBe('Standing desk'); expect(stored.rooms.choose.data).toMatchObject({ needsNote: 'budget about 450 €, it’s for me, 1.90 m', status: 'exploring', tone: 'curious', locale: { country: 'FR', currency: 'EUR' } });
  expect(errs).toEqual([]);
});

test('CR-12/WG-13/14: a blank subject alone is refused with the needs wording; the library message is Choose’s', async ({ page }) => {
  await seed(page, []);
  await page.goto('/?chooseRoom');
  const subject = page.getByRole('textbox', { name: 'What do you want to choose?' });
  await subject.press('Shift+Enter'); await page.getByRole('textbox', { name: 'Your budget and needs, optional' }).fill('budget about 500 €');
  await expect(page.locator('.why')).toHaveText('Add what you want to choose; the needs alone are not enough.');
  await expect(page.getByRole('button', { name: 'Carry the lantern in' })).toBeDisabled();
});

test('CR-12/CR-44/CR-90: the locale line follows the settings and its link opens the Choose room settings', async ({ page }) => {
  await seed(page, [], { choose: { country: 'CH', currency: 'CHF', useWeb: false } });
  await page.goto('/?chooseRoom');
  const line = page.locator('.locale');
  await expect(line).toContainText('Prices for Switzerland in CHF · web off, from the model’s knowledge · change');
  await line.getByRole('button', { name: 'change' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Choose', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(dialog.getByLabel('Country')).toHaveValue('CH');
  await dialog.getByLabel('Use the web').check();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(line).toContainText('Prices for Switzerland in CHF · research on the web · change');
});

test('CR-90: country, currency, tone and Use the web persist; the currency follows the country until set by hand', async ({ page }) => {
  await seed(page, []);
  await page.goto('/?chooseRoom');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Choose', exact: true }).click();
  await dialog.getByLabel('Country').selectOption('US');
  await expect(dialog.getByLabel('Currency')).toHaveValue('USD');
  await dialog.getByLabel('Currency').selectOption('EUR');
  await dialog.getByLabel('Country').selectOption('GB');
  await expect(dialog.getByLabel('Currency')).toHaveValue('EUR');
  await dialog.getByLabel('Default tone').selectOption('expert');
  await dialog.getByLabel('Use the web').uncheck();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings')!).choose)).toMatchObject({ country: 'GB', currency: 'EUR', defaultTone: 'expert', useWeb: false });
  await page.screenshot({ path: `${shots}/settings.png`, animations: 'disabled' });
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Choose', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Country')).toHaveValue('GB');
  await expect(page.getByRole('dialog').getByLabel('Use the web')).not.toBeChecked();
  await expect(page.getByRole('dialog').getByLabel('Default tone')).toHaveValue('expert');
  // The default tone is what Welcome starts with.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('radio', { name: 'Expert', exact: true })).toBeChecked();
});

test('CR-12: the three most recent Choose subjects are Gallery’s resting card with Continue; Browse all opens Gallery', async ({ page }) => {
  const errs = errors(page);
  await seed(page, library);
  await page.goto('/?chooseRoom');
  await expect(page.locator('.lede')).toHaveCount(0);
  const cards = page.locator('.welcome .card');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('3D printer'); await expect(cards.nth(0)).toContainText('bought'); await expect(cards.nth(0)).toContainText('Bought 3D printer A');
  await expect(cards.nth(0)).toContainText('549 €');
  await expect(cards.nth(1)).toContainText('Sofa bed'); await expect(cards.nth(1)).toContainText('decided');
  await expect(cards.nth(2)).toContainText('Espresso machine'); await expect(cards.nth(2)).toContainText('3 missing');
  await expect(cards.nth(0)).toContainText('2 needs · 2 criteria · 2 shortlisted');
  await expect(cards.nth(0).getByText('Continue', { exact: true })).toBeVisible();
  await page.screenshot({ path: `${shots}/welcome-recents.png`, fullPage: true, animations: 'disabled' });
  await expect(page.getByRole('button', { name: 'Browse all 6' })).toBeVisible();
  await page.getByRole('button', { name: 'Browse all 6' }).click();
  await expect(space(page)).toHaveAttribute('aria-label', 'Gallery');
  await page.keyboard.press('Control+1');
  await cards.nth(1).click();
  await expect(space(page)).toHaveAttribute('aria-label', 'Survey');
  await expect(page.locator('header .subject-field .title')).toContainText('Sofa bed');
  expect(errs).toEqual([]);
});

test('CR-12/CR-24: Gallery tabs count and filter, the name filter and the five sorts', async ({ page }) => {
  const errs = errors(page);
  await seed(page, library);
  await toGallery(page);
  const options = page.locator('.cg .grid').getByRole('option');
  const titles = async () => (await options.evaluateAll(els => els.map(e => e.getAttribute('aria-label')!.slice(0, 12))));
  await expect(options).toHaveCount(6);
  const tab = (name: string) => page.getByRole('button', { name: new RegExp(`^${name}`) });
  await expect(tab('All')).toContainText('6'); await expect(tab('exploring')).toContainText('4'); await expect(tab('decided')).toContainText('1'); await expect(tab('bought')).toContainText('1');
  await page.screenshot({ path: `${shots}/gallery.png`, fullPage: true, animations: 'disabled' });
  await tab('exploring').click();
  await expect(options).toHaveCount(4); await expect(page.locator('.count')).toHaveText('4 of 6');
  // Counts follow the name filter.
  await tab('All').click();
  await page.getByRole('searchbox', { name: 'Filter by name' }).fill('desk');
  await expect(options).toHaveCount(1); await expect(page.locator('.count')).toHaveText('1 of 6');
  await expect(tab('All')).toContainText('1'); await expect(tab('bought')).toContainText('0');
  await tab('bought').click();
  await expect(page.locator('.nomatch')).toContainText('No subject matches “desk” in bought');
  await page.locator('.nomatch').getByRole('button', { name: 'Clear filter' }).click();
  await expect(options).toHaveCount(1); await expect(page.getByRole('searchbox', { name: 'Filter by name' })).toHaveValue('');
  await tab('All').click(); await expect(options).toHaveCount(6);
  // Sorts.
  const sort = page.getByRole('combobox', { name: 'Sort' });
  expect(await titles()).toEqual(['3D printer', 'Sofa bed for', 'Espresso mac', 'Headphones', 'Desk lamp', 'Family car']);
  await sort.selectOption('created');
  expect(await titles()).toEqual(['Headphones', 'Sofa bed for', 'Desk lamp', 'Espresso mac', '3D printer', 'Family car']);
  await sort.selectOption('title');
  expect(await titles()).toEqual(['3D printer', 'Desk lamp', 'Espresso mac', 'Family car', 'Headphones', 'Sofa bed for']);
  await page.getByRole('button', { name: 'Reverse order' }).click();
  expect(await titles()).toEqual(['Sofa bed for', 'Headphones', 'Family car', 'Espresso mac', 'Desk lamp', '3D printer']);
  await page.getByRole('button', { name: 'Reverse order' }).click();
  await sort.selectOption('status');
  expect(await titles()).toEqual(['Espresso mac', 'Headphones', 'Desk lamp', 'Family car', 'Sofa bed for', '3D printer']);
  await sort.selectOption('nearest');
  expect(await titles()).toEqual(['3D printer', 'Sofa bed for', 'Desk lamp', 'Headphones', 'Family car', 'Espresso mac']);
  expect(errs).toEqual([]);
});

test('CR-24/WG-61..68: selecting lifts the card with its history; rename, keyboard and delete', async ({ page }) => {
  const errs = errors(page);
  await seed(page, library);
  await toGallery(page);
  const printer = page.getByRole('option', { name: '3D printer', exact: true });
  await printer.click();
  await expect(printer).toHaveAttribute('aria-selected', 'true');
  await expect(printer.getByRole('button', { name: 'Open in Survey' })).toBeVisible();
  for (const name of ['Rename', 'Reveal', 'Delete']) await expect(printer.getByRole('button', { name: new RegExp(`^${name}`) })).toBeVisible();
  await expect(printer.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(printer.locator('.vt li')).toHaveText([/Marked 3D printer A as bought/, /Chose 3D printer A/, /Started exploring/].map(r => r) as never);
  await expect(printer.getByText('A price is an indication, not a promise.')).toBeVisible();
  await expect(printer.getByRole('heading', { name: 'Board' })).toBeVisible();
  await expect(printer).toContainText('2 of 2 answered'); await expect(printer).toContainText('budget about 500 €');
  await page.screenshot({ path: `${shots}/gallery-lifted.png`, fullPage: true, animations: 'disabled' });
  // The un-chosen product stays on its card, struck, with when.
  const lamp = page.getByRole('option', { name: 'Desk lamp', exact: true });
  await expect(lamp).toContainText('No pick'); await expect(lamp).toContainText('Desk lamp A'); await expect(lamp).toContainText('un-chosen');
  await lamp.click(); await expect(lamp.locator('.vt li').first()).toContainText('Un-chose Desk lamp A; exploring again');
  // Rename: F2, a blank title is refused, Enter saves, Esc cancels.
  await lamp.press('F2');
  const rename = lamp.getByRole('textbox', { name: 'Rename', exact: true });
  await rename.fill(''); await rename.press('Enter'); await expect(lamp.getByRole('alert')).toBeVisible();
  await rename.fill('Reading lamp'); await rename.press('Enter');
  const renamed = page.getByRole('option', { name: 'Reading lamp', exact: true }); await expect(renamed).toBeVisible();
  expect(await page.evaluate(() => Object.values(localStorage).filter(v => v.includes('"title":"Reading lamp"')).length)).toBe(1);
  // Keyboard: arrows move the selection by position, Esc folds the lift back.
  await renamed.press('Home'); await expect(page.locator('.cg .card.selected')).toHaveAttribute('aria-label', '3D printer');
  await page.locator('.cg .card.selected').press('ArrowRight');
  await expect(page.locator('.cg .card.selected')).toHaveAttribute('aria-label', /Sofa bed/);
  await page.locator('.cg .card.selected').press('Escape');
  await expect(page.locator('.cg .card.selected')).toHaveCount(0);
  // Delete: the dialog carries Choose's numbers; Cancel has the focus; the file goes to the recycle bin.
  await renamed.click(); await renamed.press('Delete');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Delete “Reading lamp”?'); await expect(dialog).toContainText('nodes · 2 needs · 2 criteria · 2 shortlisted');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.screenshot({ path: `${shots}/gallery-delete.png`, animations: 'disabled' });
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.locator('.cg .grid').getByRole('option')).toHaveCount(5);
  expect(await page.evaluate(() => Object.keys(localStorage).some(k => k.startsWith('lantern.recycled.')))).toBe(true);
  // Open in Survey.
  await printer.click(); await printer.getByRole('button', { name: 'Open in Survey' }).click();
  await expect(space(page)).toHaveAttribute('aria-label', 'Survey');
  expect(errs).toEqual([]);
});

test('WG-70: an empty library says so and leads to Welcome', async ({ page }) => {
  await seed(page, []);
  await toGallery(page, '/?chooseRoom&study=1&subject=Seed'); // creates one subject, then delete it
  const card = page.getByRole('option', { name: 'Seed', exact: true }); await card.click(); await card.press('Delete');
  await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No choices yet' })).toBeVisible();
  await page.getByRole('button', { name: 'Start one' }).click();
  await expect(space(page)).toHaveAttribute('aria-label', 'Welcome');
});

test('CR-13/CR-90/RS-19: the subject menu edits tone, the needs note and the locale', async ({ page }) => {
  await seed(page, [library[0]]);
  await page.goto('/?chooseRoom&study=1&resume=1');
  await page.locator('header .subject-field .title').click();
  const menu = page.locator('.subject-menu');
  await expect(menu.getByLabel('Your needs, in your words')).toHaveValue('budget about 500 €');
  await menu.getByLabel('Your needs, in your words').fill('budget about 600 €, for my kids'); await menu.getByLabel('Your needs, in your words').press('Tab'); await menu.getByLabel('Tone').selectOption('expert');
  await menu.getByLabel('Country').selectOption('DE'); await expect(menu.getByLabel('Currency')).toHaveValue('EUR');
  await menu.getByLabel('Country').selectOption('GB'); await expect(menu.getByLabel('Currency')).toHaveValue('GBP');
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('lantern.subject.'))!)!).rooms.choose.data)).toMatchObject({
    needsNote: 'budget about 600 €, for my kids', tone: 'expert', locale: { country: 'GB', currency: 'GBP' } });
});
