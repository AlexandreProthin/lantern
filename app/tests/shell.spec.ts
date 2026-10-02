import { test, expect } from '@playwright/test';
test('M4: first-run Welcome follows D1 with all three space icons', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'What do you want to learn?' })).toBeFocused();
  await expect(page.getByRole('button', {name:'Carry the lantern in',exact:true})).toBeDisabled();
  await expect(page.locator('header nav button')).toHaveCount(3);
  await expect(page.locator('header nav').getByRole('button', {name:'Study',exact:true})).toBeDisabled();
  await expect(page.getByRole('button', {name:'Gallery',exact:true})).toBeDisabled();
});
