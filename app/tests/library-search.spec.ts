import { test, expect, type Page } from '@playwright/test';
import { addChooseChild, newChooseSubject, validateChoose } from '../src/rooms/choose/rules';
// WG-80..86: search inside every subject, from Welcome and the Gallery, both rooms; a result opens its node.

type Spec = [id: string, parent: string | null, title: string, state: string, content: string];
/** Learn: n3 is open, so n4 under it is not readable yet (GV-120) and is never found. */
const course: Spec[] = [
  ['n0', null, 'Ocean tides', 'lit', 'Tides come from the Moon and the Sun.'],
  ['n1', 'n0', 'Tidal gravity', 'lit', 'The Moon’s gravity pulls the near side of the ocean harder than the far side.'],
  ['n2', 'n0', 'Spring tides', 'understood', 'When Sun and Moon align, the range is largest.'],
  ['n3', 'n0', 'Tidal bores', 'open', ''],
  ['n4', 'n3', 'Severn bore', 'lit', 'A secret wave that only gravity explains.'],
];
function learnSubject() {
  const at = (i: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
  const nodes = Object.fromEntries(course.map(([id, parent, title, state, content], i) => [id, { id, parents: parent ? [parent] : [], title, hook: `Why ${title.toLowerCase()} matters`,
    kind: parent ? 'deeper' : 'subject', state, content, author: { kind: 'user', by: 'x' }, dialogue: [], createdAt: at(i), createdBy: 'user',
    ...(state === 'understood' ? { data: { understoodBy: 'demonstrated' } } : {}) }]));
  return { format: 'lantern/2', id: 'ocean-tides', title: 'Ocean tides', createdAt: at(0),
    rooms: { learn: { model: 'opus', effort: 'medium', data: { tone: 'curious' }, focusId: 'n0', rootId: 'n0', log: [], nodes } } };
}
function chooseSubject() {
  const s = newChooseSubject('Standing desk', { tone: 'engineer', model: 'opus', effort: 'medium', locale: { country: 'FR', currency: 'EUR' } }, 'Alex'), v = s.rooms.choose;
  v.nodes[v.rootId].state = 'lit';
  const product = addChooseChild(v, v.rootId, { title: 'Desk with a gravity lock', hook: 'Keeps its height without power', kind: 'product', createdBy: 'model' });
  validateChoose(v);
  return { subject: s, productId: product.id };
}
const choose = chooseSubject();

async function seed(page: Page) {
  await page.addInitScript(([subjects]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    for (const s of subjects) localStorage.setItem(`lantern.subject.${s.id}`, JSON.stringify(s));
    localStorage.setItem('lantern.recents', JSON.stringify(subjects.map(s => s.id)));
    localStorage.setItem('lantern.settings', JSON.stringify({ companion: { show: false }, choose: { country: 'FR', currency: 'EUR' } }));
  }, [[learnSubject(), choose.subject]] as const);
}
const focusOf = (page: Page, id: string, room: string) => page.evaluate(([id, room]) => JSON.parse(localStorage.getItem(`lantern.subject.${id}`)!).rooms[room].focusId, [id, room]);
const errors = (page: Page) => { const list: string[] = []; page.on('pageerror', e => list.push(e.message)); return list; };

test('WG-80, WG-82, WG-84: Welcome searches inside every subject and a result opens its node', async ({ page }) => {
  const errs = errors(page);
  await seed(page);
  await page.goto('/');
  const find = page.getByRole('searchbox', { name: 'Search inside your subjects' });
  await expect(find).toBeVisible();
  await find.fill('gravity');
  const results = page.locator('.library-search');
  // Grouped by subject, in title order; the other room's subject says where it lives.
  await expect(results.locator('.group')).toHaveCount(2);
  await expect(results.locator('.group').first().locator('h3')).toHaveText('Ocean tides');
  await expect(results.locator('.group').nth(1)).toHaveAttribute('data-subject', choose.subject.id);
  await expect(results.locator('.group').nth(1).locator('h3')).toHaveText('Standing deskin Choose');
  // A node under an open node is not readable yet, so its text is not found (GV-120).
  await expect(results.locator('.hit[data-node="n4"]')).toHaveCount(0);
  const hit = results.locator('.hit[data-node="n1"]');
  await expect(hit.locator('.node')).toHaveText('Tidal gravity');
  await expect(hit.locator('mark').first()).toHaveText('gravity');
  // The cards come back when the field is cleared.
  await find.press('Escape'); await expect(results).toHaveCount(0); await expect(page.locator('.shelf .card').first()).toBeVisible();
  // Keys: Down from the field to the results.
  await find.fill('spring tides'); await expect(results.locator('.hit')).toHaveCount(1);
  await find.press('ArrowDown'); await expect(results.locator('.hit[data-node="n2"]')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('header nav button[aria-current=page]')).toHaveAttribute('aria-label', 'Study');
  await expect(page.locator('.graph .node[data-id="n2"]')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => focusOf(page, 'ocean-tides', 'learn')).toBe('n2');
  await expect(page.locator('.panel')).toContainText('When Sun and Moon align');
  // Nothing found says so.
  await page.locator('header nav').getByRole('button', { name: 'Welcome', exact: true }).click();
  await find.fill('zebra'); await expect(results).toContainText('Nothing inside your subjects mentions “zebra”');
  expect(errs).toEqual([]);
});

test('WG-81, WG-84: the Gallery filter searches inside too, and a result in the other room opens there', async ({ page }) => {
  const errs = errors(page);
  await seed(page);
  await page.goto('/');
  await page.locator('header nav').getByRole('button', { name: 'Gallery', exact: true }).click();
  await page.getByRole('textbox', { name: 'Filter subjects' }).fill('gravity lock');
  const results = page.locator('.library-search');
  await expect(results.getByRole('heading', { name: 'Inside your subjects' })).toBeVisible();
  await expect(results.locator('.hit')).toHaveCount(1);
  await results.locator(`.hit[data-node="${choose.productId}"]`).click();
  await expect(page.locator('html')).toHaveAttribute('data-room', 'choose');
  await expect.poll(() => focusOf(page, choose.subject.id, 'choose')).toBe(choose.productId);
  await expect(page.locator(`.graph .node[data-id="${choose.productId}"]`)).toHaveAttribute('aria-pressed', 'true');
  expect(errs).toEqual([]);
});
