import { test, expect } from '@playwright/test';
test('M4: first-run Welcome follows D1 with all three space icons', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'What do you want to learn?' })).toBeFocused();
  await expect(page.getByRole('button', {name:'Carry the lantern in',exact:true})).toBeDisabled();
  await expect(page.locator('header nav button')).toHaveCount(3);
  await expect(page.locator('header nav').getByRole('button', {name:'Study',exact:true})).toBeDisabled();
  await expect(page.getByRole('button', {name:'Gallery',exact:true})).toBeDisabled();
});
test('RS-53: header mark renders under the installed app CSP', async ({ page }) => {
  // The dev server sends no CSP; replay the one from tauri.conf.json so blocked assets fail here too.
  const { readFileSync } = await import('node:fs');
  const csp: string = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8')).app.security.csp;
  const refused: string[] = [];
  page.on('console', m => { if (/Content Security Policy/i.test(m.text()) && !/connect-src/.test(m.text())) refused.push(m.text()); });
  await page.route('/', async route => { const r = await route.fetch(); await route.fulfill({ response: r, headers: { ...r.headers(), 'content-security-policy': csp } }); });
  await page.goto('/');
  const art = page.locator('header .mark svg');
  await expect(art).toBeVisible();
  expect((await art.boundingBox())?.width).toBe(28);
  await expect(page.locator('header .mark')).toHaveAttribute('title', 'Welcome');
  expect(refused).toEqual([]);
});
