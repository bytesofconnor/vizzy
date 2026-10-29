import { expect, test, type Page, type Route } from '@playwright/test';
import { PROMPT_LINES } from '../lib/prompt-ideas';

type ComposeBody = {
  prompt?: string;
  disposition?: string;
  seed?: unknown;
};

function piece(slug: string, title: string) {
  return {
    slug,
    kicker: 'Session',
    title,
    note: 'A chart from this session.',
    config: {
      schemaVersion: 1,
      chart: { type: 'bar' },
      dataMapping: { x: 'month', y: 'revenue' },
      axes: {
        x: { label: 'Month' },
        y: { label: 'Revenue' },
      },
    },
    data: [
      { month: 'Jan', revenue: 1 },
      { month: 'Feb', revenue: 2 },
    ],
  };
}

function sse(slug: string, title: string) {
  const url = `http://localhost:3456/c/${slug}`;
  const event = {
    stage: 'done',
    progress: 100,
    message: 'Ready to paste',
    url,
    png: `${url}.png`,
    piece: piece(slug, title),
  };
  return `data: ${JSON.stringify(event)}\n\n`;
}

async function holdCharts(page: Page, seen: ComposeBody[]) {
  let count = 0;
  await page.route('**/api/compose', async (route: Route) => {
    const body = route.request().postDataJSON() as ComposeBody;
    seen.push(body);
    count += 1;
    const slug = `made${count}`;
    await route.fulfill({
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
      body: sse(slug, `Made chart ${count}`),
    });
  });
}

test('a new chart lands on the paste url and an empty click still generates', async ({ page }) => {
  const seen: ComposeBody[] = [];
  await holdCharts(page, seen);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const ask = page.getByRole('textbox', { name: 'What should the chart show?' });
  await ask.fill('Bitcoin price from March to June 2021');
  await page.getByRole('button', { name: 'Generate my chart' }).click();
  await expect(page.getByRole('heading', { name: 'Made chart 1' })).toBeVisible();
  await expect(page).toHaveURL(/\/c\/made1$/);

  await page.getByRole('button', { name: 'Share chart' }).first().click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(page.url()).toBe(copied);

  const revise = page.getByRole('textbox', { name: 'Revise this chart' });
  await expect(revise).toHaveValue('');
  await page.getByRole('button', { name: 'New chart' }).click();
  await expect(page.getByRole('heading', { name: 'Made chart 2' })).toBeVisible();
  await expect(page).toHaveURL(/\/c\/made2$/);
  await expect(revise).toHaveValue('');
  const bare = seen.at(-1);
  expect(bare?.seed).toBeUndefined();
  expect(bare?.prompt && PROMPT_LINES.includes(bare.prompt)).toBe(true);
});

test('a phone new chart uses typed text and revise drops the previous subject', async ({ page }) => {
  const seen: ComposeBody[] = [];
  await holdCharts(page, seen);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'What should the chart show?' }).fill('Bitcoin price from March to June 2021');
  await page.getByRole('button', { name: 'Generate my chart' }).click();
  await expect(page.getByRole('heading', { name: 'Made chart 1' })).toBeVisible();
  await expect(page).toHaveURL(/\/c\/made1$/);

  const revise = page.getByRole('textbox', { name: 'Revise this chart' });
  await revise.fill('Solar capacity added by country in 2023');
  await page.getByRole('button', { name: 'New chart' }).click();
  await expect(page.getByRole('heading', { name: 'Made chart 2' })).toBeVisible();
  await expect(page).toHaveURL(/\/c\/made2$/);
  await expect(revise).toHaveValue('');
  expect(seen.at(-1)).toEqual({ prompt: 'Solar capacity added by country in 2023' });

  await revise.fill('US unemployment since 2019');
  await page.getByRole('button', { name: 'Revise' }).click();
  await expect(page.getByRole('heading', { name: 'Made chart 3' })).toBeVisible();
  await expect(page).toHaveURL(/\/c\/made3$/);
  expect(seen.at(-1)).toEqual({
    prompt: 'US unemployment since 2019',
    disposition: 'ask',
  });
});
