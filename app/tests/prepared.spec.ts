import { test, expect, type Page } from '@playwright/test';

// A prepared Learn subject (DM-70..77): written ahead, dropped into the library, lit by replay.
const at = (s: number) => new Date(Date.UTC(2026, 10, 12, 10, 0, s)).toISOString();
const author = { kind: 'model', model: 'claude-opus-5-5', effort: 'high', generationId: 'authored-1' };
const node = (id: string, parent: string | null, title: string, s: number, extra: Record<string, unknown> = {}) => ({
  id, parents: parent ? [parent] : [], title, hook: `Hook of ${title}`, kind: parent ? 'axis' : 'subject', state: 'open',
  content: `About ${title}.`, author, dialogue: [], createdAt: at(s), createdBy: parent ? 'model' : 'user', ...extra });
const course = {
  format: 'lantern/2', id: 'prepared-course', title: 'Prepared course', createdAt: at(0),
  rooms: { learn: { model: 'opus', effort: 'medium', focusId: 'root', rootId: 'root', data: { tone: 'engineer' }, log: [], nodes: {
    root: node('root', null, 'Prepared course', 0, { state: 'lit', content: 'Welcome. Start with [Attention](node:a1) later.' }),
    a: node('a', 'root', 'Transformers', 1),
    a1: node('a1', 'a', 'Attention', 2, { kind: 'exercise', content: 'Compute $QK^T$ for a tiny example.\n\n<details>\n<summary>Solution</summary>\n\nThe **answer** is $\\frac{1}{2}$.\n\n</details>' }),
    b: node('b', 'root', 'Tokenizers', 3, { data: { deadEnd: true } }),
    c: node('c', 'root', 'Sampling', 4),
  } } }
};
async function open(page: Page) {
  await page.addInitScript(subject => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    localStorage.setItem('lantern.subject.prepared-course', JSON.stringify(subject));
    localStorage.setItem('lantern.recents', JSON.stringify(['prepared-course']));
  }, course);
  await page.goto('/?study=1&resume=1');
}
const graphNode = (page: Page, id: string) => page.locator(`.graph .node[data-id="${id}"]`);
const saved = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.subject.prepared-course')!).rooms.learn);

test('LR-90..92, GV-120: a prepared subject shows its first level, replays without a call, and grows as it is lit', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page);
  const panel = page.locator('.panel');
  for (const id of ['root', 'a', 'b', 'c']) await expect(graphNode(page, id)).toBeVisible();
  await expect(graphNode(page, 'a1')).toHaveCount(0);
  // NP-71: a link to a node not shown yet is plain text.
  await expect(panel.locator('.md .node-link')).toHaveCount(0);
  await expect(panel.getByText('Attention', { exact: true })).toBeVisible();

  await graphNode(page, 'a').click();
  await expect(panel.getByText('This node is still dark.')).toBeVisible();
  await expect(panel.getByText('About Transformers.')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Light it up', exact: true }).click();
  await expect(panel.getByText('About Transformers.')).toBeVisible();
  await expect(graphNode(page, 'a1')).toBeVisible();
  await expect(graphNode(page, 'a')).toHaveAttribute('data-state', 'lit');
  await expect.poll(async () => (await saved(page)).nodes.a.state).toBe('lit');
  expect((await saved(page)).log).toEqual([]);
  // NP-4, DM-17a: the authored model and effort, no tokens.
  await expect(panel.locator('.meta')).toContainText('high');

  // NP-75..77: the solution is folded until opened, with markdown and math inside.
  await panel.getByRole('button', { name: /Attention/ }).first().click();
  await panel.getByRole('button', { name: 'Light it up', exact: true }).click();
  const solution = panel.locator('details.md-details');
  await expect(solution.locator('summary')).toHaveText('Solution');
  await expect(solution.locator('strong')).toBeHidden();
  await solution.locator('summary').click();
  await expect(solution.locator('strong')).toHaveText('answer');
  await expect(solution.locator('.katex').first()).toBeVisible();
  // Root's link is now a link, since Attention is shown.
  await graphNode(page, 'root').click();
  await expect(panel.locator('.md .node-link')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('LR-90, LR-100..102: a dead end replays and stops; a prepared leaf asks for directions; the mark toggles', async ({ page }) => {
  await open(page);
  const panel = page.locator('.panel');
  await graphNode(page, 'b').click();
  await expect(graphNode(page, 'b')).toHaveAttribute('data-dead-end', 'true');
  await expect(graphNode(page, 'b').locator('.end-cap')).toBeVisible();
  await panel.getByRole('button', { name: 'Light it up', exact: true }).click();
  await expect(panel.getByText('About Tokenizers.')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'More options', exact: true })).toBeDisabled();
  expect((await saved(page)).log).toEqual([]);
  await panel.getByRole('button', { name: 'Not a dead end', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'More options', exact: true })).toBeEnabled();
  await expect(graphNode(page, 'b').locator('.end-cap')).toHaveCount(0);

  await graphNode(page, 'c').click();
  await panel.getByRole('button', { name: 'Light it up', exact: true }).click();
  await expect(panel.getByText('About Sampling.')).toBeVisible();
  await expect.poll(async () => (await saved(page)).log.map((g: { task: string }) => g.task)).toEqual(['more']);
  await expect.poll(async () => Object.values((await saved(page)).nodes).filter((n: any) => n.parents[0] === 'c').length).toBe(3);
});

test('GV-130..136: collapse from the node menu and the button, with a count, kept across a reload', async ({ page }) => {
  await open(page);
  await graphNode(page, 'root').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Collapse all' }).click();
  for (const id of ['a', 'b', 'c']) await expect(graphNode(page, id)).toHaveCount(0);
  await expect(graphNode(page, 'root').locator('.folded')).toHaveText('+3');
  await expect(graphNode(page, 'root')).toHaveAttribute('aria-label', /3 hidden/);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('lantern.collapsed') ?? '{}')['prepared-course'])).toEqual(['root']);
  await page.reload();
  await expect(graphNode(page, 'root')).toBeVisible();
  await expect(graphNode(page, 'a')).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand all' }).click();
  await expect(graphNode(page, 'a')).toBeVisible();
  // Right on a folded node unfolds it.
  await graphNode(page, 'root').click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Collapse all' }).click();
  await graphNode(page, 'root').focus();
  await page.keyboard.press('ArrowRight');
  await expect(graphNode(page, 'a')).toBeVisible();
  await expect(graphNode(page, 'a')).toBeFocused();
});

test('LR-110..115: Replay from the start darkens everything and Restore progress brings it back', async ({ page }) => {
  await open(page);
  const panel = page.locator('.panel');
  await graphNode(page, 'a').click();
  await panel.getByRole('button', { name: 'Light it up', exact: true }).click();
  await expect(graphNode(page, 'a1')).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByRole('button', { name: 'Replay from the start…' }).click();
  const confirm = page.getByRole('alertdialog');
  await expect(confirm).toContainText('2 lit nodes go dark');
  await confirm.getByRole('button', { name: 'Replay from the start', exact: true }).click();
  await expect.poll(async () => (await saved(page)).nodes.root.state).toBe('open');
  await page.keyboard.press('Escape');
  await expect(graphNode(page, 'a')).toHaveCount(0);
  await expect(panel.getByText('This node is still dark.')).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.getByRole('button', { name: 'Restore progress' }).click();
  await expect.poll(async () => (await saved(page)).nodes.a.state).toBe('lit');
  expect((await saved(page)).data.progressSnapshot).toBeUndefined();
  await page.keyboard.press('Escape');
  await expect(graphNode(page, 'a1')).toBeVisible();
});
