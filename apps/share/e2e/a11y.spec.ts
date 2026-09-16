import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { PIECES } from '../lib/pieces';

async function noSeriousAxe(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('main#content')).toBeVisible();
  if (path === '/' || path.startsWith('/c/')) {
    await expect(page.locator('.vizzy-chart-container').first()).toBeVisible();
    await expect(page.locator('.vizzy-loading')).toHaveCount(0, { timeout: 15_000 });
  }
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const serious = results.violations.filter(
    (issue) => issue.impact === 'serious' || issue.impact === 'critical'
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test('home has no serious axe issues', async ({ page }) => {
  await noSeriousAxe(page, '/');
});

test('home on a phone has no serious axe issues', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await noSeriousAxe(page, '/');
});

test('example chart has no serious axe issues', async ({ page }) => {
  await noSeriousAxe(page, `/c/${PIECES[0].slug}`);
});

test('agents page has no serious axe issues', async ({ page }) => {
  await noSeriousAxe(page, '/agents');
});

test('terms has no serious axe issues', async ({ page }) => {
  await noSeriousAxe(page, '/terms');
});
