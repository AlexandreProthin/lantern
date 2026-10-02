import { test, expect } from '@playwright/test';
test('M3: startup holds Welcome as a D1 stub', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lantern' })).toBeVisible();
  await expect(page.getByText('Welcome design is in progress.')).toBeVisible();
  await expect(page.getByRole('button', {name:'Study',exact:true})).toBeDisabled();
});
