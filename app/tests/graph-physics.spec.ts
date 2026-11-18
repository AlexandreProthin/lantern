import { test, expect, type Page } from '@playwright/test';
import { graphMotion } from '../src/ui/graph/graphMotion';

// GV-16 (opening reveal), GV-17 (drag and pin) on a small course: a subject, 3 modules, 3 lessons each.
function course() {
  const at = (i: number) => new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString();
  const nodes: Record<string, unknown> = {}, ids: string[] = [];
  for (let i = 0; i < 13; i++) {
    const id = 'n' + String(i).padStart(3, '0');
    const parents = i === 0 ? [] : [ids[i <= 3 ? 0 : 1 + (i - 4) % 3]];
    nodes[id] = { id, parents, title: i === 0 ? 'Drag course' : i <= 3 ? `M${i}. Module ${i}` : `Lesson ${i} of the course`, hook: 'Hook', kind: i === 0 ? 'subject' : 'deeper',
      state: 'lit', content: 'Text.', author: { kind: 'user', by: 'x' }, dialogue: [], createdAt: at(i), createdBy: 'user' };
    ids.push(id);
  }
  return { format: 'lantern/2', id: 'drag-course', title: 'Drag course', createdAt: at(0),
    rooms: { learn: { model: 'opus', effort: 'medium', data: { tone: 'curious' }, focusId: ids[0], rootId: ids[0], log: [], nodes } } };
}
/** Seeds storage before any app code runs, once per test (a reload keeps what the app stored, pins included).
 *  Seeding from a loaded page raced its own settings write, flushed on unload over the seeded settings. */
async function open(page: Page, settings: object = {}) {
  await page.addInitScript(([s, settings]) => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.clear();
    localStorage.setItem(`lantern.subject.${s.id}`, JSON.stringify(s));
    localStorage.setItem('lantern.recents', JSON.stringify([s.id]));
    localStorage.setItem('lantern.settings', JSON.stringify({ companion: { show: false }, ...settings }));
  }, [course(), settings] as const);
  await page.goto('/?study=1&resume=1');
  await expect(page.locator('.graph .node[data-id]')).toHaveCount(13);
  await expect(page.locator('.graph')).toHaveAttribute('data-settled', 'true');
}
/** Every time the graph starts revealing, what the nodes' and edges' animations were. */
const watchReveal = () => {
  const seen: { depth: string; name: string; delay: number }[][] = []; (window as unknown as { reveals: typeof seen }).reveals = seen;
  new MutationObserver(() => {
    const g = document.querySelector('.graph.revealing'); if (!g || (g as HTMLElement).dataset.seen || !g.querySelector('.node[data-id]')) return; (g as HTMLElement).dataset.seen = '1';
    seen.push([...g.querySelectorAll<HTMLElement>('.node[data-id], .edges path[data-edge]')].map(el => {
      const style = getComputedStyle(el);
      return { depth: el.style.getPropertyValue('--depth'), name: style.animationName, delay: parseFloat(style.animationDelay) * (style.animationDelay.endsWith('ms') ? 1 : 1000) };
    }));
  }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
};
const at = (page: Page, id: string) => page.locator(`.graph .node[data-id="${id}"]`).evaluate(el => [parseFloat((el as HTMLElement).style.left), parseFloat((el as HTMLElement).style.top)]);

test('GV-16: the settled map comes in outward by depth in about half a second, then nothing is left animating', async ({ page }) => {
  await page.addInitScript(watchReveal);
  await open(page);
  await expect.poll(() => page.evaluate(() => (window as unknown as { reveals: unknown[] }).reveals.length)).toBe(1);
  const items = (await page.evaluate(() => (window as unknown as { reveals: { depth: string; name: string; delay: number }[][] }).reveals[0]));
  const nodes = items.filter(i => i.name.endsWith('open-node')), edges = items.filter(i => i.name.endsWith('open-edge'));
  expect(nodes).toHaveLength(13); expect(edges).toHaveLength(12);
  const delay = (d: string) => nodes.find(n => n.depth === d)!.delay;
  expect(delay('0')).toBe(0);
  expect(delay('1')).toBeGreaterThan(0);
  expect(delay('2')).toBeGreaterThan(delay('1'));
  expect(delay('2') + graphMotion.OPEN_REVEAL_NODE_MS).toBeLessThanOrEqual(graphMotion.OPEN_REVEAL_MS + 1);
  // Over quickly, and the class goes, so no animation stays on the nodes.
  await expect(page.locator('.graph.revealing')).toHaveCount(0, { timeout: graphMotion.OPEN_REVEAL_MS + 1500 });
  expect(await page.locator('.graph .node[data-id]').first().evaluate(el => el.getAnimations().length)).toBe(0);
});

test('GV-16: no reveal under reduced motion', async ({ page }) => {
  await page.addInitScript(watchReveal);
  await open(page, { appearance: { reduceMotion: 'on' } });
  await page.waitForTimeout(graphMotion.OPEN_REVEAL_MS + 200);
  expect(await page.evaluate(() => (window as unknown as { reveals: unknown[] }).reveals.length)).toBe(0);
  expect(await page.locator('.graph .node[data-id]').first().evaluate(el => getComputedStyle(el).animationName)).toBe('none');
});

test('GV-17: a dragged node is pinned where dropped, only its branch moves, kept across a reload, and released by a double-click or the menu', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page);
  await expect(page.locator('.graph.revealing')).toHaveCount(0, { timeout: 3000 });
  const module = 'n001', lesson = 'n004', other = 'n002';
  const before = { module: await at(page, module), lesson: await at(page, lesson), other: await at(page, other) };
  const box = (await page.locator(`.graph .node[data-id="${module}"] .disc`).boundingBox())!;
  const k = await page.locator('.world').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).a);
  // A press that moves a few pixels drags (the view does not pan); the map at rest does not warm up as a whole.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width / 2 + i * 15, box.y + box.height / 2 + i * 6);
  await page.mouse.up();
  await expect(page.locator('.graph')).toHaveAttribute('data-settled', 'true');
  const after = { module: await at(page, module), lesson: await at(page, lesson), other: await at(page, other) };
  expect(after.module[0] - before.module[0]).toBeCloseTo(150 / k, 0);
  expect(after.module[1] - before.module[1]).toBeCloseTo(60 / k, 0);
  expect(Math.hypot(after.lesson[0] - before.lesson[0], after.lesson[1] - before.lesson[1])).toBeGreaterThan(20);   // its branch follows
  expect(after.other).toEqual(before.other);                                                                           // the rest stays
  // The drag did not focus the node; it is pinned, marked and stored app-side (not in the subject).
  await expect(page.locator(`.graph .node[data-id="${module}"]`)).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator(`.graph .node[data-id="${module}"]`)).toHaveClass(/pinned/);
  await expect(page.locator(`.graph .node[data-id="${module}"] .pin-mark`)).toHaveCount(1);
  await expect(page.locator(`.graph .node[data-id="${module}"]`)).toHaveAttribute('title', /pinned/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('lantern.pinned') ?? '{}'));
  expect(Object.keys(stored['drag-course'])).toEqual([module]);
  expect(await page.evaluate(() => localStorage.getItem('lantern.subject.drag-course'))).not.toContain('pin');

  // A click still focuses.
  await page.locator(`.graph .node[data-id="${other}"]`).click();
  await expect(page.locator(`.graph .node[data-id="${other}"]`)).toHaveAttribute('aria-pressed', 'true');

  // Reopened, the pin holds the node in place.
  await page.reload();
  await expect(page.locator('.graph')).toHaveAttribute('data-settled', 'true');
  await expect(page.locator(`.graph .node[data-id="${module}"]`)).toHaveClass(/pinned/);
  expect(await at(page, module)).toEqual(after.module);

  // The tree layout ignores the pin; back in the free layout it holds again.
  await page.getByRole('button', { name: 'Tree layout', exact: true }).click();
  await expect(page.locator(`.graph .node[data-id="${module}"] .pin-mark`)).toHaveCount(0);
  await expect(page.locator(`.graph .node[data-id="${module}"]`)).not.toHaveAttribute('data-draggable', '');
  await page.getByRole('button', { name: 'Free layout', exact: true }).click();
  await expect(page.locator('.graph')).toHaveAttribute('data-settled', 'true', { timeout: 15000 });
  expect(await at(page, module)).toEqual(after.module);

  // Released from the node menu.
  await page.locator(`.graph .node[data-id="${module}"]`).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Release pin' }).click();
  await expect(page.locator(`.graph .node[data-id="${module}"]`)).not.toHaveClass(/pinned/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('lantern.pinned'))).toBe('{}');

  // Pinned again by a drag, released by a double-click.
  const box2 = (await page.locator(`.graph .node[data-id="${lesson}"] .disc`).boundingBox())!;
  await page.mouse.move(box2.x + 22, box2.y + 22); await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(box2.x + 22 - i * 10, box2.y + 22);
  await page.mouse.up();
  await expect(page.locator(`.graph .node[data-id="${lesson}"]`)).toHaveClass(/pinned/);
  await page.locator(`.graph .node[data-id="${lesson}"]`).dblclick();
  await expect(page.locator(`.graph .node[data-id="${lesson}"]`)).not.toHaveClass(/pinned/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('lantern.pinned'))).toBe('{}');
  expect(errors).toEqual([]);
});

test('GV-17: a press on the root or the background pans; the root is never dragged', async ({ page }) => {
  await open(page);
  await expect(page.locator('.graph.revealing')).toHaveCount(0, { timeout: 3000 });
  const root = await at(page, 'n000');
  const transform = () => page.locator('.world').evaluate(el => getComputedStyle(el).transform);
  const t0 = await transform();
  const box = (await page.locator('.graph .node[data-id="n000"] .disc').boundingBox())!;
  await page.mouse.move(box.x + 22, box.y + 22); await page.mouse.down();
  for (let i = 1; i <= 5; i++) await page.mouse.move(box.x + 22 + i * 12, box.y + 22 + i * 4);
  await page.mouse.up();
  expect(await at(page, 'n000')).toEqual(root);
  expect(await transform()).not.toBe(t0);
  expect(await page.evaluate(() => localStorage.getItem('lantern.pinned'))).toBeNull();
});
