import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { addChooseChild, newChooseSubject, validateChoose } from '../src/rooms/choose/rules';
import type { Cell, Source } from '../src/rooms/choose/rules';

/** A prepared lantern/2 Choose subject (the Survey is not needed): four products, five ranked criteria, cells of every status. */
function board(opts: { shortlist?: number } = {}) {
  const s = newChooseSubject('3D printer', { tone: 'curious', model: 'opus', effort: 'medium', locale: { country: 'FR', currency: 'EUR' } }, 'Alex'), v = s.rooms.choose;
  v.nodes[v.rootId].state = 'lit';
  const add = (kind: 'criterion' | 'product', title: string, state: string, hook = '') => { const n = addChooseChild(v, v.rootId, { title, kind, hook, createdBy: 'user' }); n.state = state; return n; };
  const count = opts.shortlist ?? 3;
  const products = ['Printer A', 'Printer B', 'Printer C', 'Printer D'].map((t, i) => add('product', t, i < count ? 'shortlisted' : 'candidate'));
  const price = add('criterion', 'Price', 'must', 'Fits your 500 € budget'), volume = add('criterion', 'Build volume', 'must', 'You want to print large cases'),
    noise = add('criterion', 'Noise', 'must', 'It runs in your flat'), enclosure = add('criterion', 'Enclosure', 'nice', 'Lets you print ABS'),
    warranty = add('criterion', 'Warranty', 'irrelevant', 'Not a concern'); add('criterion', 'Unranked', 'open');
  price.data = { measure: 'price' };
  const src = (kind: Source['kind'], name: string, read = '2026-10-12', value?: string): Source => ({ kind, name, read, ...(value ? { value } : {}) });
  const cell = (c: Partial<Cell> & Pick<Cell, 'value' | 'sources'>): Cell => ({ generationId: 'g1', at: '2026-10-15T09:00:00.000Z', ...c });
  const [A, B, C] = products;
  A.data = { cells: {
    [price.id]: cell({ value: '399 €', sources: [src('shop', 'Maker shop', '2026-10-12')] }),
    [volume.id]: cell({ value: '256 × 256 mm', sources: [src('manufacturer', 'Maker specs', '2026-10-11', '256 mm'), src('measured', 'Lab review', '2026-10-09', '254 mm')] }),
    [noise.id]: cell({ value: '48 dB', sources: [src('measured', 'Noise lab', '2026-10-08')], user: { value: '45 dB', at: '2026-10-14T10:00:00.000Z', by: 'Alex' } }),
    [warranty.id]: cell({ value: '2 years', sources: [src('manufacturer', 'Maker site')] }) } };
  B.data = { cells: {
    [price.id]: cell({ value: '449 €', sources: [src('shop', 'Other shop', '2026-10-10')] }),
    [volume.id]: cell({ value: '250 mm', disagree: true, note: 'The maker says 256 mm, the review measured 250 mm.', sources: [src('manufacturer', 'Maker specs', '2026-10-11', '256 mm'), src('measured', 'Lab review', '2026-10-09', '250 mm')] }),
    [noise.id]: cell({ value: '40 dB', sources: [src('sponsored', 'Promo blog', '2026-10-05')] }) } };
  C.data = { cells: {
    [volume.id]: cell({ value: null, sources: [] }),
    [enclosure.id]: cell({ value: 'Optional', sources: [{ kind: 'model', name: 'Model knowledge', read: '2026-10' }] }),
    [noise.id]: cell({ value: '52 dB', sources: [src('opinion', 'Forum thread', '2026-10-03')] }) } };
  validateChoose(v);
  return { subject: s, ids: { A: A.id, B: B.id, C: C.id, D: products[3].id, price: price.id, volume: volume.id, noise: noise.id, enclosure: enclosure.id, warranty: warranty.id } };
}
type Board = ReturnType<typeof board>;

async function open(page: Page, b: Board = board(), settings: Record<string, unknown> = {}) {
  await page.addInitScript(({ id, subject, extra }) => {
    const raw = localStorage.getItem('lantern.settings');
    const stored = raw ? JSON.parse(raw) : {};
    if (!localStorage.getItem('lantern.settings.seeded')) {
      localStorage.setItem('lantern.settings', JSON.stringify({ ...stored, ...extra, ui: { ...(stored.ui ?? {}), lastRoom: 'choose' } }));
      localStorage.setItem(`lantern.subject.${id}`, JSON.stringify(subject)); localStorage.setItem('lantern.recents', JSON.stringify([id]));
      localStorage.setItem('lantern.settings.seeded', '1');
    }
  }, { id: b.subject.id, subject: b.subject, extra: settings });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?chooseRoom&study=1&resume=1');
  await toCompare(page);
  await expect(page.locator('main.compare table')).toBeVisible();
  return { b, errors };
}
const toCompare = async (page: Page) => { await expect(page.locator('header small')).toContainText('shortlisted'); await page.getByRole('button', { name: 'Compare', exact: true }).click(); };
const cellOf = (page: Page, p: string, c: string) => page.locator(`td[data-cell="${p}:${c}"]`);
const row = (page: Page, c: string) => page.locator(`th[data-row="${c}"]`);
const cards = (page: Page) => page.locator('[data-testid="card"]');
const shot = async (page: Page, name: string) => { await page.waitForTimeout(450); await page.screenshot({ path: `test-results/compare/${name}.png` }); };
const stored = (page: Page, id: string) => page.evaluate(i => JSON.parse(localStorage.getItem(`lantern.subject.${i}`)!).rooms.choose, id);

test('CR-50: columns, grouped rows, irrelevant behind the toggle, and the row summary', async ({ page }) => {
  const { b, errors } = await open(page);
  await expect(page.locator('th.prod .pn')).toHaveText(['Printer A', 'Printer B', 'Printer C']);
  await expect(page.locator('th.corner')).toContainText('3 shortlisted');
  await expect(page.locator('tr.grp th')).toHaveText(['Must', 'Nice to have']);
  await expect(page.locator('tr.crow th .cn')).toHaveText(['Price', 'Build volume', 'Noise', 'Enclosure']);
  await expect(row(page, b.ids.volume)).toContainText('You want to print large cases');
  await expect(row(page, b.ids.volume).locator('.sum')).toHaveText('2 manufacturer · 2 measured · ≠ 1 · ? 1');
  await expect(row(page, b.ids.noise).locator('.sum')).toHaveText('1 measured · 1 opinion · ✎ 1');
  await expect(page.locator('tr.crow .cn', { hasText: 'Unranked' })).toHaveCount(0);
  await expect(page.locator('tr.crow .cn', { hasText: 'Warranty' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Show irrelevant (1)' }).click();
  await expect(page.locator('tr.grp th')).toHaveText(['Must', 'Nice to have', 'Irrelevant']);
  await expect(row(page, b.ids.warranty)).toBeVisible();
  await shot(page, 'ledger');
  await page.getByRole('button', { name: 'Hide irrelevant (1)' }).click();
  await expect(row(page, b.ids.warranty)).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('CR-50, CR-51, CR-42: cells show value, sources, disagreement, nothing found, sponsored, price and the user\'s value inline', async ({ page }) => {
  const { b } = await open(page);
  const price = cellOf(page, b.ids.A, b.ids.price);
  await expect(price).toContainText('399 €'); await expect(price).toContainText('an indication, not a promise · seen 12 Oct'); await expect(price).toContainText('shop'); await expect(price).toContainText('Maker shop · 12 Oct');
  const vol = cellOf(page, b.ids.B, b.ids.volume);
  await expect(vol).toContainText('≠'); await expect(vol).toContainText('The maker says 256 mm'); await expect(vol.locator('.k')).toHaveText(['manufacturer', 'measured']);
  const none = cellOf(page, b.ids.C, b.ids.volume);
  await expect(none).toContainText('? No source found'); await expect(none).toHaveAttribute('data-status', 'none');
  const spons = cellOf(page, b.ids.B, b.ids.noise);
  await expect(spons.locator('.k[data-k="sponsored"]')).toHaveText('sponsored'); await expect(spons).toContainText('Promo blog: not used');
  expect(await spons.locator('.k[data-k="sponsored"]').evaluate(e => getComputedStyle(e).textDecorationLine)).toContain('line-through');
  const edited = cellOf(page, b.ids.A, b.ids.noise);
  await expect(edited).toHaveAttribute('data-status', 'edited'); await expect(edited.locator('.v')).toContainText('45 dB');
  await expect(edited.locator('.k[data-k="user"]')).toHaveText('yours');
  await expect(edited.locator('s')).toHaveText('48 dB');
  expect(await edited.locator('s').evaluate(e => getComputedStyle(e).textDecorationLine)).toContain('line-through');
  await expect(cellOf(page, b.ids.C, b.ids.enclosure).locator('.k[data-k="model"]')).toHaveText('model knowledge');
  await expect(cellOf(page, b.ids.A, b.ids.enclosure)).toContainText('Not filled yet');
});

test('CR-51 click rules: row band, header, cell card, single-card rule', async ({ page }) => {
  const { b } = await open(page);
  await expect(page.locator('tr.ev')).toHaveCount(0);
  await row(page, b.ids.volume).click();
  await expect(page.locator('tr.ev.full')).toHaveCount(1); await expect(cards(page)).toHaveCount(3);
  await expect(page.locator('tr.ev.full th.evh')).toContainText('Evidence for Build volume');
  await shot(page, 'band');
  await row(page, b.ids.price).click(); await expect(page.locator('tr.ev.full')).toHaveCount(2); await expect(cards(page)).toHaveCount(6);
  await row(page, b.ids.price).click(); await expect(page.locator('tr.ev.full')).toHaveCount(1);
  await page.locator('th.corner button').click(); await expect(page.locator('tr.ev.full')).toHaveCount(4); await expect(cards(page)).toHaveCount(12);
  await page.locator('th.corner button').click(); await expect(page.locator('tr.ev')).toHaveCount(0);
  // a cell unfolds only its card; unfolded rows fold first
  await row(page, b.ids.volume).click(); await expect(cards(page)).toHaveCount(3);
  await cellOf(page, b.ids.B, b.ids.volume).click();
  await expect(page.locator('tr.ev.full')).toHaveCount(0); await expect(page.locator('tr.ev.single')).toHaveCount(1); await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).locator('.ch b')).toHaveText('Printer B'); await shot(page, 'card');
  await cellOf(page, b.ids.C, b.ids.volume).click(); await expect(cards(page)).toHaveCount(1); await expect(cards(page).locator('.ch b')).toHaveText('Printer C');
  // a single card yields to another criterion: it folds and only that row opens
  await row(page, b.ids.price).click();
  await expect(page.locator('tr.ev.single')).toHaveCount(0); await expect(page.locator('tr.ev.full')).toHaveCount(1); await expect(cards(page)).toHaveCount(3);
  await expect(page.locator('tr.ev.full th.evh')).toContainText('Evidence for Price');
  // inside an unfolded row only the clicked card stays; again folds it; Esc and the fold button too
  await cellOf(page, b.ids.A, b.ids.price).click(); await expect(cards(page)).toHaveCount(1);
  await cellOf(page, b.ids.A, b.ids.price).click(); await expect(page.locator('tr.ev')).toHaveCount(0);
  await cellOf(page, b.ids.A, b.ids.price).click(); await cards(page).getByRole('button', { name: 'Fold' }).click(); await expect(page.locator('tr.ev')).toHaveCount(0);
  await cellOf(page, b.ids.A, b.ids.price).locator('button').focus(); await page.keyboard.press('Enter'); await expect(cards(page)).toHaveCount(1);
  await page.keyboard.press('Escape'); await expect(cards(page)).toHaveCount(0);
});

test('CR-51: cells are edited only in a card; Save as mine and Revert to the room\'s keep the room\'s value', async ({ page }) => {
  const { b } = await open(page);
  await expect(cellOf(page, b.ids.A, b.ids.volume).locator('input')).toHaveCount(0);
  await cellOf(page, b.ids.A, b.ids.volume).click();
  const card = cards(page);
  await expect(card.locator('.src')).toHaveCount(2); await expect(card.locator('.src').first()).toContainText('256 mm'); await expect(card.locator('.src').first()).toContainText('Maker specs · read 11 Oct');
  await expect(card.getByRole('button', { name: 'Save as mine' })).toBeDisabled(); await expect(card.getByRole('button', { name: "Revert to the room's" })).toHaveCount(0);
  await card.getByRole('textbox').fill('260 mm (measured by me)'); await card.getByRole('button', { name: 'Save as mine' }).click();
  const cell = cellOf(page, b.ids.A, b.ids.volume);
  await expect(cell).toHaveAttribute('data-status', 'edited'); await expect(cell.locator('.v')).toContainText('260 mm (measured by me)'); await expect(cell.locator('s')).toHaveText('256 × 256 mm');
  await expect.poll(async () => (await stored(page, b.subject.id)).nodes[b.ids.A].data.cells[b.ids.volume]?.user?.value).toBe('260 mm (measured by me)');
  expect((await stored(page, b.subject.id)).nodes[b.ids.A].data.cells[b.ids.volume].value).toBe('256 × 256 mm');
  await expect(card.getByRole('button', { name: "Revert to the room's" })).toBeVisible();
  await card.getByRole('button', { name: "Revert to the room's" }).click();
  await expect(cell).toHaveAttribute('data-status', 'ok'); await expect(cell.locator('.v')).toContainText('256 × 256 mm');
  // a cell that was never filled can still hold the user's value
  await cellOf(page, b.ids.A, b.ids.enclosure).click(); await expect(cards(page)).toHaveCount(1); await cards(page).getByRole('textbox').fill('Yes'); await cards(page).getByRole('textbox').press('Enter');
  await expect(cellOf(page, b.ids.A, b.ids.enclosure)).toHaveAttribute('data-status', 'edited');
});

test('CP-13, CR-44: Check this on a cell and on a row; hidden with the web off, with the banner', async ({ page }) => {
  const { b, errors } = await open(page);
  await expect(page.locator('.banner')).toHaveCount(0);
  await cellOf(page, b.ids.B, b.ids.volume).click();
  await cards(page).getByRole('button', { name: 'Check this' }).click();
  await expect(cards(page).getByRole('button', { name: 'Check this' })).toBeEnabled();
  await expect.poll(async () => (await stored(page, b.subject.id)).log.at(-1)?.task).toBe('check');
  expect((await stored(page, b.subject.id)).log.at(-1).data.web).toBe(true);
  await row(page, b.ids.volume).click();
  await page.getByRole('button', { name: 'Check this row' }).click();
  await expect.poll(async () => (await stored(page, b.subject.id)).log.filter((g: { task: string }) => g.task === 'check').length).toBe(2);
  expect(errors).toEqual([]);
  // web off
  await page.addInitScript(() => { const s = JSON.parse(localStorage.getItem('lantern.settings') ?? '{}'); localStorage.setItem('lantern.settings', JSON.stringify({ ...s, choose: { ...(s.choose ?? {}), useWeb: false } })); });
  await page.reload(); await toCompare(page);
  await expect(page.locator('.banner')).toContainText('Use the web is off');
  await row(page, b.ids.volume).click();
  await expect(page.getByRole('button', { name: 'Check this row' })).toHaveCount(0); await expect(page.getByRole('button', { name: 'Check this', exact: true })).toHaveCount(0);
  await shot(page, 'web-off');
  await page.getByRole('button', { name: 'Turn the web on' }).click();
  await expect(page.locator('.banner')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Check this row' })).toBeVisible();
});

test('CR-22, CR-24: Choose, Chosen with Un-choose, Remove', async ({ page }) => {
  const { b } = await open(page);
  const head = (id: string) => page.locator(`th.prod[data-product="${id}"]`);
  await head(b.ids.B).getByRole('button', { name: 'Choose' }).click();
  await expect(head(b.ids.B)).toContainText('Chosen'); await expect(head(b.ids.B)).toHaveClass(/chosen/);
  await expect(head(b.ids.B).getByRole('button', { name: 'Un-choose' })).toBeVisible(); await expect(head(b.ids.B).getByRole('button', { name: 'Remove' })).toHaveCount(0);
  await expect(cellOf(page, b.ids.B, b.ids.volume)).toHaveClass(/chosen/);
  await expect.poll(async () => (await stored(page, b.subject.id)).data.status).toBe('decided');
  await shot(page, 'chosen');
  await head(b.ids.A).getByRole('button', { name: 'Choose' }).click();
  await expect(head(b.ids.A)).toContainText('Chosen'); await expect(head(b.ids.B)).not.toContainText('Chosen'); await expect(head(b.ids.B).getByRole('button', { name: 'Choose' })).toBeVisible();
  await head(b.ids.A).getByRole('button', { name: 'Un-choose' }).click();
  await expect(head(b.ids.A).getByRole('button', { name: 'Choose' })).toBeVisible(); await expect.poll(async () => (await stored(page, b.subject.id)).data.status).toBe('exploring');
  await cellOf(page, b.ids.C, b.ids.noise).click(); await expect(cards(page)).toHaveCount(1);
  await head(b.ids.C).getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('th.prod .pn')).toHaveText(['Printer A', 'Printer B']); await expect(cards(page)).toHaveCount(0);
  await expect.poll(async () => (await stored(page, b.subject.id)).nodes[b.ids.C].state).toBe('candidate');
});

test('CP-40, CP-41: Fill Compare fills empty cells, striped with a research line, Cancel stops it', async ({ page }) => {
  const { b } = await open(page, board(), {});
  await page.goto('/?chooseRoom&study=1&resume=1&delay=250'); await toCompare(page);
  await expect(page.locator('main.compare table')).toBeVisible();
  const empty = cellOf(page, b.ids.A, b.ids.enclosure);
  await expect(empty).toHaveAttribute('data-status', 'empty');
  await page.getByRole('button', { name: 'Fill Compare' }).click();
  await expect(page.locator('.research')).toContainText('Researching'); await expect(page.locator('.research')).toContainText(/Searching|Reading/);
  await expect(page.locator('td.filling').first()).toBeVisible(); await expect(page.locator('td.filling').first()).toContainText('Researching…');
  expect(await page.locator('td.filling').first().evaluate(e => getComputedStyle(e).backgroundImage)).toContain('repeating-linear-gradient');
  await shot(page, 'research');
  await page.locator('.research').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('.research')).toHaveCount(0); await expect(page.locator('td.filling')).toHaveCount(0);
  await page.getByRole('button', { name: 'Fill Compare' }).click();
  await expect(page.locator('.research')).toHaveCount(0, { timeout: 20_000 });
  await expect(empty).toHaveAttribute('data-status', 'ok'); await expect(empty).toContainText('value');
  await expect(page.getByRole('button', { name: 'Fill Compare' })).toBeDisabled();
});

test('CR-50: one product invites shortlisting more; nothing shortlisted shows the empty state', async ({ page }) => {
  const { b } = await open(page, board({ shortlist: 1 }));
  await expect(page.locator('th.prod .pn').first()).toHaveText('Printer A'); await expect(page.locator('.more')).toContainText('Printer B, Printer C, Printer D');
  await shot(page, 'one-product');
  await page.locator('th.prod[data-product="' + b.ids.A + '"]').getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText('Nothing to compare yet')).toBeVisible(); await expect(page.locator('table')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open the Survey' }).click(); await expect(page.locator('main.compare')).toHaveCount(0);
});

test('GV-100: reduced motion unfolds and folds instantly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const { b } = await open(page);
  await row(page, b.ids.volume).click();
  const band = page.locator('tr.ev.full');
  const h = await band.evaluate(e => e.getBoundingClientRect().height);
  expect(h).toBeGreaterThan(60); await expect(band).not.toHaveAttribute('data-fx', '1');
  await row(page, b.ids.volume).click(); await expect(page.locator('tr.ev')).toHaveCount(0);
});

test('motion: a band grows from zero height and the table is intact afterwards', async ({ page }) => {
  const { b } = await open(page);
  await row(page, b.ids.volume).click();
  const early = await page.locator('tr.ev.full').evaluate(e => e.getBoundingClientRect().height);
  await expect.poll(() => page.locator('tr.ev.full').evaluate(e => e.dataset.fx ?? '')).toBe('');
  const late = await page.locator('tr.ev.full').evaluate(e => e.getBoundingClientRect().height);
  expect(early).toBeLessThan(late); expect(late).toBeGreaterThan(60);
  await expect(page.locator('tr.ev.full .w').first()).toHaveCSS('overflow', 'visible');
});
