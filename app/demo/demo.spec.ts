// The web demo, end to end on the built site: the prefilled new subject, lighting, a check and its answer,
// and the seeded TCP subject. ?demoFast skips the model-like wait.
import { test, expect } from '@playwright/test';

test('a visitor carries in Blender 3D, lights an axis, is tested and answers', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/?demoFast');
  await expect(page.getByRole('complementary', { name: 'Web demo' })).toBeVisible();
  await expect(page.locator('input.subj')).toHaveValue('Blender 3D');
  await expect(page.locator('textarea.dir')).toHaveValue(/why it is so popular/);
  await expect(page.getByText('How TCP congestion control works').first()).toBeVisible();

  await page.locator('textarea.dir').press('Enter');
  await expect(page.getByText('Why it is a special piece of software').first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'How it became so popular · axis · open' }).click();
  await page.getByRole('button', { name: 'Light it up' }).click();
  await expect(page.getByText('Free Blender', { exact: false }).first()).toBeVisible({ timeout: 15000 });

  await page.getByRole('button', { name: 'Test me' }).click();
  await expect(page.getByText('which do you think mattered most')).toBeVisible({ timeout: 15000 });
  await page.getByPlaceholder(/answer the tutor/).fill('The 2.80 release, because the interface became friendly.');
  await page.getByPlaceholder(/answer the tutor/).press('Control+Enter');
  await expect(page.getByText('Most people point to')).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'More options' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the seeded TCP subject opens and its open nodes light up', async ({ page }) => {
  await page.goto('/?demoFast');
  await page.getByRole('button', { name: /Continue/ }).first().click();
  await expect(page.getByRole('heading', { name: 'AIMD: add a little, halve on loss' })).toBeVisible();
  await page.getByRole('button', { name: 'Fast retransmit · deeper · open' }).click();
  await page.getByRole('button', { name: 'Light it up' }).click();
  await expect(page.getByText('still waiting for 5')).toBeVisible({ timeout: 15000 });
});

test('Reset clears what the visitor did', async ({ page }) => {
  await page.goto('/?demoFast');
  await page.locator('textarea.dir').press('Enter');
  await expect(page.getByText('Why it is a special piece of software').first()).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.locator('input.subj')).toHaveValue('Blender 3D');
});
