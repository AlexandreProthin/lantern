import { test, expect } from '@playwright/test';
test('PQ-23: web scaffold uses the fake provider', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lantern' })).toBeVisible();
  await expect(page.getByText('Browser · fake tutor')).toBeVisible();
});
