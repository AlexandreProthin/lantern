import { test, expect, type Page } from '@playwright/test';
// GV-140..149: the outline view and the graph filters, on a small prepared course.

type Spec = [id: string, parent: string | null, title: string, state: string, content?: string];
/** root > M1 (lit) > L1a (understood), L1b (lit) > L1b1 (open); root > M2 (understood) > L2a (understood); root > M3 (lit). L1b links to M3 in its text. */
const course: Spec[] = [
  ['n0', null, 'Course', 'lit'], ['n1', 'n0', 'Module one', 'lit'], ['n2', 'n1', 'Lesson 1a', 'understood'],
  ['n3', 'n1', 'Lesson 1b', 'lit', 'See [module three](node:n6).'], ['n4', 'n3', 'Lesson 1b deeper', 'open'],
  ['n5', 'n0', 'Module two', 'understood'], ['n7', 'n5', 'Lesson 2a', 'understood'], ['n6', 'n0', 'Module three', 'lit']
];
function subject() {
  const at = (i: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
  const nodes = Object.fromEntries(course.map(([id, parent, title, state, content], i) => [id, { id, parents: parent ? [parent] : [], title, hook: `Why ${title.toLowerCase()} matters`,
    kind: parent ? 'deeper' : 'subject', state, content: content ?? `About ${title}.`, author: { kind: 'user', by: 'x' }, dialogue: [], createdAt: at(i), createdBy: 'user',
    ...(state === 'understood' ? { data: { understoodBy: 'demonstrated' } } : {}) }]));
  return { format: 'lantern/2', id: 'views-course', title: 'Course', createdAt: at(0),
    rooms: { learn: { model: 'opus', effort: 'medium', data: { tone: 'curious' }, focusId: 'n0', rootId: 'n0', log: [], nodes } } };
}
async function open(page: Page, settings: Record<string, unknown> = {}) {
  // Seeded once, before the app's first script, so no write of the app's own settings can come after it.
  await page.addInitScript(([s, settings]) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem(`lantern.subject.${s.id}`, JSON.stringify(s));
    localStorage.setItem('lantern.recents', JSON.stringify([s.id]));
    localStorage.setItem('lantern.settings', JSON.stringify({ companion: { show: false }, ...settings }));
  }, [subject(), settings] as const);
  await page.goto('/?study=1&resume=1');
  await expect(page.locator('.graph .node[data-id]')).toHaveCount(course.length);
}
const shownIds = (page: Page) => page.locator('.graph .node[data-id]').evaluateAll(els => els.filter(el => getComputedStyle(el).display !== 'none').map(el => (el as HTMLElement).dataset.id).sort());
const positions = (page: Page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('.graph .node[data-id]')].map(n => [n.dataset.id!, n.style.left + ',' + n.style.top])));
const focusOf = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.subject.views-course')!).rooms.learn.focusId);

test('GV-140..143: the outline lists the tree, moves with the graph keys, focuses on click and is kept app-wide', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Outline', exact: true }).click();
  const tree = page.getByRole('tree');
  await expect(tree).toBeVisible();
  await expect(page.locator('.graph .node[data-id="n0"]')).toBeHidden();
  const rows = tree.getByRole('treeitem');
  await expect(rows).toHaveCount(course.length);
  await expect(rows.first()).toHaveAttribute('aria-selected', 'true');
  await expect(tree.locator('[data-id="n4"]')).toHaveAttribute('aria-level', '4');
  // The glyph carries the node's state, as on the map (the room's colours apply).
  await expect(tree.locator('[data-id="n2"] .glyph-cell')).toHaveAttribute('data-state', 'understood');
  // The hook shows on hover.
  const hook = tree.locator('[data-id="n6"] .hook');
  await expect(hook).toBeHidden();
  await tree.locator('[data-id="n6"]').hover();
  await expect(hook).toBeVisible();
  // Keys: Right = first child, Down = next sibling, Left = parent, Up = previous sibling.
  await rows.first().focus();
  await page.keyboard.press('ArrowRight'); await expect(tree.locator('[data-id="n1"]')).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(tree.locator('[data-id="n5"]')).toBeFocused();
  await page.keyboard.press('ArrowUp'); await expect(tree.locator('[data-id="n1"]')).toBeFocused();
  await page.keyboard.press('ArrowRight'); await expect(tree.locator('[data-id="n2"]')).toBeFocused();
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowRight'); await expect(tree.locator('[data-id="n4"]')).toBeFocused();
  await page.keyboard.press('ArrowLeft'); await expect(tree.locator('[data-id="n3"]')).toBeFocused();
  await expect.poll(() => focusOf(page)).toBe('n3');
  await expect(page.locator('.panel h1')).toHaveText('Lesson 1b');
  // Enter hands over to the panel.
  await page.keyboard.press('Enter'); await expect(page.locator('.panel')).toBeFocused();
  // A click focuses the node in the panel.
  await tree.locator('[data-id="n7"]').click();
  await expect(page.locator('.panel h1')).toHaveText('Lesson 2a');
  await expect(tree.locator('[data-id="n7"]')).toHaveAttribute('aria-selected', 'true');
  // Collapse: folding Module one hides its rows; Right unfolds it again.
  await tree.locator('[data-id="n1"]').click();
  await tree.locator('[data-id="n1"]').locator('xpath=..').locator('.fold').click();
  await expect(rows).toHaveCount(course.length - 3);
  await expect(tree.locator('[data-id="n1"]')).toHaveAttribute('aria-expanded', 'false');
  await tree.locator('[data-id="n1"]').focus(); await page.keyboard.press('ArrowRight');
  await expect(rows).toHaveCount(course.length);
  // App-wide UI state: kept after a reload.
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.settings')!).ui.graphView)).toBe('outline');
  await page.reload();
  await expect(page.getByRole('tree')).toBeVisible();
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  await expect(page.locator('.graph')).toHaveAttribute('data-view', 'graph');
  await expect(page.locator('.graph .node[data-id="n0"]')).toBeVisible();
  await expect(page.getByRole('tree')).toHaveCount(0);
});

test('GV-144: on a phone the outline fills the graph side and a tap opens the panel sheet', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await open(page, { ui: { graphView: 'outline' } });
  const tree = page.getByRole('tree');
  await expect(tree).toBeVisible();
  await tree.locator('[data-id="n6"]').click();
  await expect(page.getByRole('button', { name: 'Graph' }).first()).toBeVisible();
  await expect(page.locator('.panel h1')).toHaveText('Module three');
  await expect(page.locator('.panel h1')).toBeInViewport();
});

test('GV-145..149: each filter hides nodes without moving the map, Recenter fits what is left, and filters last the session only', async ({ page }) => {
  await open(page);
  await expect(page.locator('.graph')).toHaveAttribute('data-settled', 'true');
  const before = await positions(page);
  await expect(page.locator('.legend.shown')).toHaveCount(1); // open by default on the desktop
  const filters = page.getByRole('group', { name: 'Filters' });
  // One module only.
  await filters.getByRole('combobox', { name: 'Module' }).selectOption({ label: 'Module one' });
  await expect.poll(() => shownIds(page)).toEqual(['n0', 'n1', 'n2', 'n3', 'n4']);
  await expect(page.locator('.edges path[data-edge="n5"]')).toBeHidden();
  expect(await page.locator('.graph').getAttribute('data-settled')).toBe('true');
  expect(await positions(page)).toEqual(before);
  // Recenter fits the visible nodes only: the hidden ones may fall outside the view.
  await page.getByRole('button', { name: 'Recenter', exact: true }).click();
  await page.waitForTimeout(800);
  const inView = await page.evaluate(() => { const box = document.querySelector('.graph')!.getBoundingClientRect();
    return [...document.querySelectorAll<HTMLElement>('.graph .node[data-id]')].filter(n => getComputedStyle(n).display !== 'none').every(n => { const r = n.querySelector('.disc')!.getBoundingClientRect(); return r.left >= box.left && r.right <= box.right && r.top >= box.top && r.bottom <= box.bottom; }); });
  expect(inView).toBe(true);
  await filters.getByRole('combobox', { name: 'Module' }).selectOption({ label: 'All modules' });
  await expect.poll(() => shownIds(page)).toHaveLength(course.length);
  // Hide understood: finished branches go; an understood node with something left under it stays.
  await filters.getByRole('checkbox', { name: 'Hide understood' }).check();
  await expect.poll(() => shownIds(page)).toEqual(['n0', 'n1', 'n3', 'n4', 'n6']);
  await filters.getByRole('checkbox', { name: 'Hide understood' }).uncheck();
  // Focus and neighbours: parent, children and text-link neighbours.
  await page.locator('.graph .node[data-id="n3"]').click();
  await filters.getByRole('checkbox', { name: 'Focus and neighbours' }).check();
  await expect.poll(() => shownIds(page)).toEqual(['n1', 'n3', 'n4', 'n6']);
  expect(await positions(page)).toEqual(before);
  expect(await page.locator('.graph').getAttribute('data-settled')).toBe('true');
  // Keys move over the visible nodes only.
  await page.locator('.graph .node[data-id="n3"]').focus();
  await page.keyboard.press('ArrowUp'); await expect.poll(() => focusOf(page)).toBe('n3');
  // Filters compose with the outline.
  await page.getByRole('button', { name: 'Outline', exact: true }).click();
  await expect(page.getByRole('treeitem')).toHaveCount(4);
  await page.getByRole('button', { name: 'Graph', exact: true }).click();
  // Not stored: a reload shows the whole map.
  expect(await page.evaluate(() => localStorage.getItem('lantern.settings'))).not.toContain('neighbours');
  await page.reload();
  await expect(page.locator('.graph .node[data-id]')).toHaveCount(course.length);
  await expect.poll(() => shownIds(page)).toHaveLength(course.length);
});
