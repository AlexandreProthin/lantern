import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

// B4 slice 5: Choose's Survey (CR-11, CR-14, CR-20, CR-21, CR-22, CR-24, CR-41, CR-61, CP-10).
const SHOTS = 'test-results/survey';
async function openSurvey(page: Page, query = '') {
  await page.addInitScript(() => { const s = JSON.parse(localStorage.getItem('lantern.settings') ?? '{}'); s.ui = { ...(s.ui ?? {}), lastRoom: 'choose' }; localStorage.setItem('lantern.settings', JSON.stringify(s)); });
  await page.goto(`/?chooseRoom&study=1&subject=3D%20printer${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-room', 'choose');
}
/** The intro is over: its three children are in and the lane is free. */
async function introDone(page: Page) { await expect(page.locator('.graph .node', { hasText: 'Print volume' })).toBeVisible(); await expect(page.locator('.rail .rec')).toBeEnabled(); }
const node = (page: Page, title: string | RegExp) => page.locator('.graph .node', { hasText: title });
const panel = (page: Page) => page.locator('.panel');
const counter = (page: Page, key: string) => page.locator(`.rail [data-counter="${key}"] b:not(.ghost)`);
// The graph's legend may sit over a node; the click goes to the node itself.
async function focusNode(page: Page, title: string | RegExp) { await node(page, title).dispatchEvent('click'); await expect(panel(page).locator('h1')).toHaveText(title); }

test('intro runs on open: subject lit with three children, a pictogram per kind and the legend', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await openSurvey(page, '&delay=60');
  // The intro streams into the reading panel while ghost nodes wait in the graph.
  await expect(page.locator('.graph .node[data-pending="waiting"]')).toHaveCount(3);
  await expect(panel(page).locator('.md')).toContainText('3D printer builds objects');
  await expect(node(page, 'Print volume')).toBeVisible();
  await expect(page.locator('.graph .node[data-pending]')).toHaveCount(0);
  await expect(panel(page).locator('.meta')).toContainText('subject');
  await expect(panel(page).locator('.meta')).toContainText('exploring');
  // Each kind that appears carries its own pictogram inside the disc; the subject is a larger disc with its status badge.
  const kinds = await page.locator('.graph .node').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.kind));
  expect(new Set(kinds)).toEqual(new Set(['subject', 'criterion', 'need', 'family']));
  for (const kind of new Set(kinds)) await expect(page.locator(`.graph .node[data-kind="${kind}"] .disc .layer svg.k`).first()).toBeVisible();
  const paths = await page.locator('.graph .node .disc .layer svg.k').evaluateAll(els => els.map(e => e.innerHTML));
  expect(new Set(paths).size).toBe(4);
  await expect(page.locator('.graph .node[data-kind="subject"] .disc')).toHaveCSS('width', '54px');
  await expect(page.locator('.graph .node[data-kind="subject"] .badge[data-badge="exploring"]')).toBeVisible();
  // The legend: one row per kind, then the states.
  const legend = page.locator('.graph .legend');
  await expect(legend.getByRole('group', { name: 'Kinds' }).locator('> span')).toHaveCount(7);
  await expect(legend.getByRole('group', { name: 'States' }).locator('> span')).toHaveCount(10);
  await page.screenshot({ path: `${SHOTS}/intro.png` });
  expect(errors).toEqual([]);
});

test('lighting a need or concept, finding products with progress, then the products appear', async ({ page }) => {
  test.setTimeout(60_000);
  await openSurvey(page, '&delay=120');
  await expect(node(page, 'Enclosed printers')).toBeVisible();
  // A family: Find products shows the research steps, then the products arrive with their sources and dates.
  await focusNode(page, /Enclosed printers/);
  await expect(panel(page).getByText('No products found yet.')).toBeVisible();
  await panel(page).getByRole('button', { name: 'Find products', exact: true }).click();
  await expect(panel(page).locator('.research')).toContainText('Searching…');
  await expect(panel(page).locator('.research')).toContainText('Reading bambulab.com…');
  await expect(node(page, /Printer A/)).toBeVisible({ timeout: 30_000 });
  await expect(node(page, /Printer B/)).toBeVisible();
  await expect(panel(page).locator('.research')).toHaveCount(0);
  await focusNode(page, /Printer A/);
  const facts = panel(page).locator('.facts');
  await expect(facts).toContainText('Price');
  await expect(facts).toContainText('399 €');
  await expect(facts.locator('.src .tag').first()).toHaveText('manufacturer');
  await expect(facts.locator('.price-note')).toContainText('an indication, seen');
  await expect(facts.locator('.date').first()).toContainText(/read \d{4}-\d{2}-\d{2}/);
  await page.screenshot({ path: `${SHOTS}/find.png` });
});

test('explain a need, answer it, rank a criterion; Check this follows Use the web', async ({ page }) => {
  await openSurvey(page); await introDone(page);
  const need = panel(page);
  await focusNode(page, /What will you print/);
  await expect(need.getByText('Not explained yet.')).toBeVisible();
  await need.getByRole('button', { name: 'Explain', exact: true }).click();
  await expect(need.locator('.md')).toContainText('This criterion matters');
  await need.getByRole('textbox', { name: 'Your answer' }).fill('Figurines for my kids');
  await need.getByRole('button', { name: 'Save answer' }).click();
  await expect(need.locator('.meta')).toContainText('answered');
  await expect(node(page, /What will you print/).locator('.badge[data-badge="answered"]')).toBeVisible();
  await expect(counter(page, 'needs')).toHaveText('1/1');
  await expect(node(page, /What will you print/)).toHaveAttribute('aria-label', /Figurines for my kids/);
  await need.getByRole('button', { name: 'Check this' }).click();
  await expect(need.getByRole('button', { name: 'Check this' })).toBeEnabled();
  await focusNode(page, /Print volume/);
  await expect(need.getByText('Not ranked yet.')).toBeVisible();
  // Recipe motion: a rising state fills the new look from the centre, over the old one (a MutationObserver sees the layer).
  await page.evaluate(() => { (window as any).__fills = 0; new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(n => { if (n instanceof HTMLElement && n.matches('.layer[data-role="enter"]')) (window as any).__fills++; }); }).observe(document.body, { subtree: true, childList: true }); });
  await need.getByRole('group', { name: 'How much does it matter to you?' }).getByRole('button', { name: 'Must', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__fills)).toBeGreaterThan(0);
  await expect(page.locator('.graph .node .layer[data-role="enter"]')).toHaveCount(0);
  await expect(need.locator('.meta')).toContainText('must');
  await expect(node(page, /Print volume/).locator('.badge[data-badge="must"]')).toBeVisible();
  await expect(counter(page, 'must')).toHaveText('1');
  await page.screenshot({ path: `${SHOTS}/answer-rank.png` });
});

test('web off hides Check this', async ({ page }) => {
  await page.addInitScript(() => { const s = JSON.parse(localStorage.getItem('lantern.settings') ?? '{}'); s.choose = { ...(s.choose ?? {}), useWeb: false }; localStorage.setItem('lantern.settings', JSON.stringify(s)); });
  await openSurvey(page); await introDone(page);
  await focusNode(page, /Print volume/);
  await expect(panel(page).getByRole('button', { name: 'Explain', exact: true })).toBeVisible();
  await expect(panel(page).getByRole('button', { name: 'Check this' })).toHaveCount(0);
});

test('shortlist, reject with a reason, choose, un-choose, mark as bought; the rail counts follow', async ({ page }) => {
  await openSurvey(page); await introDone(page);
  await focusNode(page, /Enclosed printers/);
  await panel(page).getByRole('button', { name: 'Find products', exact: true }).click();
  await expect(node(page, /Printer B/)).toBeVisible();
  await expect(counter(page, 'shortlist')).toHaveText('0');
  // Shortlist A and B from the panel.
  await focusNode(page, /Printer A/);
  await panel(page).getByRole('button', { name: 'Shortlist', exact: true }).click();
  await expect(node(page, /Printer A/).locator('.badge[data-badge="shortlisted"]')).toBeVisible();
  await focusNode(page, /Printer B/);
  await panel(page).getByRole('button', { name: 'Shortlist', exact: true }).click();
  await expect(counter(page, 'shortlist')).toHaveText('2');
  // Reject B with a reason: the reason is in the panel and the node's accessible name, not on the graph.
  await panel(page).getByRole('button', { name: 'Reject', exact: true }).click();
  await panel(page).getByRole('textbox', { name: 'Why reject it?' }).fill('Too loud');
  await panel(page).locator('form.reject').getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(panel(page).locator('.reason')).toContainText('Too loud');
  await expect(node(page, /Printer B/)).toHaveAttribute('aria-label', /rejected: Too loud/);
  await expect(node(page, /Printer B/).locator('.badge[data-badge="rejected"]')).toBeVisible();
  await expect(node(page, /Printer B/)).toHaveCSS('opacity', '0.35');
  await expect(counter(page, 'shortlist')).toHaveText('1');
  await panel(page).getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(panel(page).locator('.meta')).toContainText('candidate');
  // Choose A: the subject becomes decided, the rail shows the pick; un-choose goes back to exploring.
  await focusNode(page, /Printer A/);
  await panel(page).getByRole('button', { name: 'Choose', exact: true }).click();
  await expect(node(page, /Printer A/).locator('.badge[data-badge="chosen"]')).toBeVisible();
  await expect(node(page, /Printer A/).locator('.ring2')).toHaveCSS('opacity', '1');
  await expect(page.locator('.graph .node[data-kind="subject"] .badge[data-badge="decided"]')).toBeVisible();
  await expect(counter(page, 'pick')).toHaveText('✓');
  await expect(page.locator('.rail .st')).toHaveText('decided');
  await panel(page).getByRole('button', { name: 'Un-choose', exact: true }).click();
  await expect(page.locator('.graph .node[data-kind="subject"] .badge[data-badge="exploring"]')).toBeVisible();
  await expect(counter(page, 'pick')).toHaveText('—');
  await panel(page).getByRole('button', { name: 'Choose', exact: true }).click();
  await panel(page).getByRole('button', { name: 'Mark as bought' }).click();
  await expect(page.locator('.graph .node[data-kind="subject"] .badge[data-badge="bought"]')).toBeVisible();
  await expect(page.locator('.rail .st')).toHaveText('bought');
  await expect(page.locator('.rail .rec')).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/chosen.png` });
});

test('the rail marks what is missing, the board opens in place of the graph and closes with Esc', async ({ page }) => {
  await openSurvey(page); await introDone(page);
  await expect(page.locator('.graph')).toBeVisible();
  const rail = page.locator('.rail');
  await expect(rail.locator('[data-counter="needs"]')).toHaveClass(/miss/);
  await rail.locator('[data-counter="needs"]').hover();
  await expect(rail.locator('[data-counter="needs"] .tip')).toContainText('Answer: What will you print');
  await expect(rail.locator('.miss-n')).toContainText('missing');
  // Open the board by a click on the rail.
  await rail.locator('.open').click();
  const board = page.locator('.board-sheet');
  await expect(board).toBeVisible();
  await expect(page.locator('.graph')).toBeHidden();
  await expect(panel(page)).toBeVisible();
  await expect(board.locator('.missing')).toContainText('Answer: What will you print');
  // The needs card: the note in the user's words, and an open need answered on the board.
  await board.getByRole('textbox', { name: 'In your words' }).fill('Budget about 500 €');
  await board.getByRole('textbox', { name: 'In your words' }).blur();
  await board.getByRole('textbox', { name: /What will you print/ }).fill('Figurines');
  await board.getByRole('textbox', { name: /What will you print/ }).blur();
  await expect(counter(page, 'needs')).toHaveText('1/1');
  // Criteria grouped; rank with the toggles.
  await expect(board.getByRole('heading', { name: 'To rank' })).toBeVisible();
  await board.getByRole('group', { name: /Print volume/ }).getByRole('button', { name: 'must' }).click();
  await expect(board.getByRole('heading', { name: 'Must', exact: true })).toBeVisible();
  await expect(counter(page, 'must')).toHaveText('1');
  await page.screenshot({ path: `${SHOTS}/board.png` });
  // Esc folds the board back to the graph.
  await page.keyboard.press('Escape');
  await expect(board).toHaveCount(0);
  await expect(page.locator('.graph')).toBeVisible();
  // Reopen and use Back to graph; the note was kept.
  await rail.locator('.open').click();
  await expect(board.getByRole('textbox', { name: 'In your words' })).toHaveValue('Budget about 500 €');
  await board.getByRole('button', { name: /Back to graph/ }).click();
  await expect(board).toHaveCount(0);
});

test('board: find products, shortlist, reject with a reason, choose, mark as bought and Recommend', async ({ page }) => {
  await openSurvey(page); await introDone(page);
  await page.locator('.rail .open').click();
  const board = page.locator('.board-sheet');
  await board.getByRole('button', { name: 'Find products' }).click();
  await expect(board.locator('.prod')).toHaveCount(2);
  await board.locator('.prod', { hasText: 'Printer A' }).getByRole('button', { name: 'Shortlist' }).click();
  await board.locator('.prod', { hasText: 'Printer B' }).getByRole('button', { name: 'Reject' }).click();
  await board.getByRole('textbox', { name: 'Why reject it?' }).fill('Too noisy');
  await board.getByRole('button', { name: 'Reject', exact: true }).last().click();
  await expect(board.locator('.rej')).toContainText('Too noisy');
  await board.locator('.prod', { hasText: 'Printer A' }).getByRole('button', { name: 'Choose' }).click();
  await expect(board.locator('.prod.chosen')).toContainText('Printer A');
  await expect(board.locator('.top .st')).toHaveText('decided');
  await board.locator('.prod.chosen').getByRole('button', { name: 'Un-choose' }).click();
  await expect(board.locator('.top .st')).toHaveText('exploring');
  await board.getByRole('button', { name: /^Recommend now/ }).click();
  await expect(panel(page).locator('.meta')).toContainText('subject');
  await expect(panel(page).locator('.recommend')).toContainText('Choose');
  await panel(page).getByRole('button', { name: /^Choose Printer A/ }).click();
  await expect(board.locator('.prod.chosen')).toContainText('Printer A');
  await board.getByRole('button', { name: 'Mark as bought' }).click();
  await expect(board.locator('.top .st')).toHaveText('bought');
  await page.screenshot({ path: `${SHOTS}/board-bought.png` });
});

test('reduced motion: the board opens and closes instantly and no glyph layer animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openSurvey(page); await introDone(page);
  await page.locator('.rail .open').click();
  await expect(page.locator('.board-sheet')).toBeVisible();
  expect(await page.evaluate(() => document.getAnimations().filter(a => (a.effect as KeyframeEffect | null)?.target?.closest?.('.board-sheet')).length)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.board-sheet')).toHaveCount(0);
  await focusNode(page, /Print volume/);
  await panel(page).getByRole('group', { name: 'How much does it matter to you?' }).getByRole('button', { name: 'Must', exact: true }).click();
  await expect(page.locator('.graph .node .layer[data-role="enter"], .graph .node .layer[data-role="exit"]')).toHaveCount(0);
});

test('a reply offers a need, which is added to the needs; the node menu rejects a product', async ({ page }) => {
  test.setTimeout(60_000);
  await openSurvey(page); await introDone(page);
  const composer = panel(page).getByRole('textbox', { name: /^Ask about this/ });
  await composer.fill('I need it quiet'); await composer.press('Control+Enter');
  await expect(panel(page).locator('.offer')).toContainText('What is your budget?');
  await panel(page).getByRole('button', { name: 'Add to needs' }).click();
  await expect(panel(page).locator('.offer')).toHaveCount(0);
  await expect(node(page, 'What is your budget?')).toHaveAttribute('aria-label', /about 500/);
  await expect(counter(page, 'needs')).toHaveText('1/2');
  // The node menu on a product: Reject focuses it and opens the reason form in the panel.
  await focusNode(page, /Enclosed printers/);
  await panel(page).getByRole('button', { name: 'Find products', exact: true }).click();
  await expect(node(page, /Printer A/)).toBeVisible({ timeout: 20_000 });
  await node(page, /Printer A/).dispatchEvent('contextmenu');
  await page.getByRole('menuitem', { name: 'Reject' }).click();
  await expect(panel(page).locator('h1')).toHaveText(/Printer A/);
  await expect(panel(page).getByRole('textbox', { name: 'Why reject it?' })).toBeVisible();
});
