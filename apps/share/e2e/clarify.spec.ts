import { expect, test, type Page, type Route } from '@playwright/test';

type ComposeBody = {
  prompt?: string;
  disposition?: string;
  seed?: unknown;
};

async function holdMint(page: Page, seen: ComposeBody[]) {
  await page.route('**/api/compose', async (route: Route) => {
    const body = route.request().postDataJSON() as ComposeBody;
    const ambiguous = body.prompt === 'eggs' || body.prompt === 'Is the economy doing better?';
    const asking = body.disposition == null || body.disposition === 'ask';
    const firstAsk = ambiguous && asking && body.seed == null;
    if (firstAsk) {
      await route.continue();
      return;
    }
    seen.push(body);
    await route.fulfill({
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'held for the test' }),
    });
  });
}

test('ambiguous prompts ask with chips before a chart, and a clear prompt does not', async ({ page }) => {
  const seen: ComposeBody[] = [];
  await holdMint(page, seen);
  await page.goto('/');
  const field = page.getByRole('textbox', { name: 'What should the chart show?' });
  await field.fill('eggs');
  await page.getByRole('button', { name: 'Generate my chart' }).click();

  const ask = page.getByRole('group', { name: 'What should the eggs chart measure?' });
  await expect(ask).toBeVisible();
  await expect(ask.getByRole('button', { name: 'Price' })).toBeVisible();
  await expect(ask.getByRole('button', { name: 'By country' })).toBeVisible();
  await expect(ask.getByRole('button', { name: 'Over time' })).toBeVisible();
  await expect(ask.getByRole('button', { name: 'Just send it' })).toBeVisible();
  await expect(page.locator('.compose-fail')).toHaveCount(0);

  await ask.getByRole('button', { name: 'Price' }).click();
  await expect(page.locator('.compose-fail')).toHaveText('held for the test');
  await expect.poll(() => seen.at(-1)).toEqual({ prompt: 'eggs price' });
  await expect(ask).toHaveCount(0);

  await field.fill('Is the economy doing better?');
  await page.getByRole('button', { name: 'Generate my chart' }).click();
  const economy = page.getByRole('group', { name: 'Which measure should the chart use?' });
  await expect(economy.getByRole('button', { name: 'GDP' })).toBeVisible();
  await expect(economy.getByRole('button', { name: 'Unemployment' })).toBeVisible();
  await expect(economy.getByRole('button', { name: 'Prices' })).toBeVisible();
  await economy.getByRole('button', { name: 'Just send it' }).click();
  await expect(page.locator('.compose-fail')).toHaveText('held for the test');
  await expect.poll(() => seen.at(-1)).toEqual({ prompt: 'Is the economy doing better?', disposition: 'send' });

  await field.fill('Bitcoin price from March to June 2021');
  await page.getByRole('button', { name: 'Generate my chart' }).click();
  await expect.poll(() => seen.at(-1)).toEqual({ prompt: 'Bitcoin price from March to June 2021', disposition: 'ask' });
  await expect(page.locator('.compose-fail')).toHaveText('held for the test');
  await expect(page.locator('.compose-clarify')).toHaveCount(0);
});

test('clarify chips stay on a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await holdMint(page, []);
  await page.goto('/');
  await page.getByRole('textbox', { name: 'What should the chart show?' }).fill('eggs');
  await page.getByRole('button', { name: 'Generate my chart' }).click();
  const ask = page.getByRole('group', { name: 'What should the eggs chart measure?' });
  await expect(ask).toBeVisible();
  const box = await ask.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(391);
});
