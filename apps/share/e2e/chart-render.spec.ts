import { expect, test } from '@playwright/test';

test('line, bar, and multi-series charts draw without an error', async ({ page }) => {
  await page.goto('/c/ozone');
  const ozone = page.locator('.studio-chart');
  await expect(ozone.locator('path.line').first()).toBeVisible();
  await expect(ozone.locator('.vizzy-error')).toHaveCount(0);
  await expect(ozone.locator('.x-axis .tick').first()).toBeVisible();
  await expect(ozone.locator('.y-axis .tick').first()).toBeVisible();
  await expect(ozone.locator('.axis-label', { hasText: 'Year' })).toBeVisible();

  await page.goto('/c/tigers');
  const tigers = page.locator('.studio-chart');
  await expect(tigers.locator('rect.bar').first()).toBeVisible();
  await expect(tigers.locator('.vizzy-error')).toHaveCount(0);
  await expect(tigers.locator('.x-axis .tick').first()).toBeVisible();
  await expect(tigers.locator('.y-axis .tick').first()).toBeVisible();
  await expect(tigers.locator('.axis-label', { hasText: 'Country' })).toBeVisible();
  await expect(tigers.locator('.axis-label', { hasText: 'Wild tigers' })).toBeVisible();

  await page.goto('/c/reef');
  const reef = page.locator('.studio-chart');
  await expect(reef.locator('path.line')).toHaveCount(3);
  await expect(reef.locator('.vizzy-error')).toHaveCount(0);
  await expect(reef.locator('.legend-label', { hasText: 'Northern' })).toBeVisible();
  await expect(reef.locator('.legend-label', { hasText: 'Central' })).toBeVisible();
  await expect(reef.locator('.legend-label', { hasText: 'Southern' })).toBeVisible();
  await expect(reef.locator('.axis-label', { hasText: 'Year' })).toBeVisible();
  await expect(reef.locator('.axis-label', { hasText: 'Hard coral cover' })).toBeVisible();
});

test('a chart page does not scroll sideways at 390px', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/c/reef');
  const reef = page.locator('.studio-chart');
  await expect(reef.locator('path.line').first()).toBeVisible();
  await expect(reef.locator('.vizzy-error')).toHaveCount(0);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
