import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function noSeriousAxe(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('main#content')).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (issue) => issue.impact === 'serious' || issue.impact === 'critical'
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test('home has no serious axe issues', async ({ page }) => {
  await noSeriousAxe(page, '/');
});

test('example chart has no serious axe issues', async ({ page }) => {
  await noSeriousAxe(page, '/c/july');
});

test('agents page has no serious axe issues', async ({ page }) => {
  await noSeriousAxe(page, '/agents');
});
