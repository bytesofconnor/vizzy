import { expect, test } from '@playwright/test';

test('landing is the chart prompt', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A chart you can paste.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Make chart' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep with Google' })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Keep this pack');
  await expect(page.locator('body')).not.toContainText('that pack');
});

test('terms still restores by checkout email', async ({ page }) => {
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Terms' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send a restore link' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep with Google' })).toHaveCount(0);
});
