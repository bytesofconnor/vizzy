import { expect, test } from '@playwright/test';

test('new chart on a chart page opens a blank composer and does not run a demo', async ({ page }) => {
  const composed: string[] = [];
  await page.route('**/api/compose', async (route) => {
    composed.push(route.request().postData() ?? '');
    await route.fulfill({ status: 500, body: 'new chart must not compose' });
  });

  await page.goto('/c/ozone');
  await page.getByRole('button', { name: 'New chart' }).click();

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('textbox', { name: 'What should the chart show?' })).toHaveValue('');
  expect(composed).toEqual([]);
});
