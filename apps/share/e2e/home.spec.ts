import { expect, test } from '@playwright/test';
import { PIECES } from '../lib/pieces';

test('install and share images exist', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBeTruthy();
  const body = (await manifest.json()) as {
    display?: string;
    short_name?: string;
    lang?: string;
    shortcuts?: Array<{ url?: string }>;
  };
  expect(body.short_name).toBe('vizzy');
  expect(body.display).toBe('standalone');
  expect(body.lang).toBe('en');
  expect(body.shortcuts?.some((item) => item.url === '/#make-one')).toBeTruthy();
  expect((await request.get('/icon/192')).ok()).toBeTruthy();
  expect((await request.get('/opengraph-image')).ok()).toBeTruthy();
});

test('landing is the chart prompt', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'A chart you can paste' })).toBeVisible();
  await expect(page.getByText(/Get the picture, the source, and a short explanation/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Generate my chart' })).toBeVisible();
  await expect(page.getByLabel('Example questions')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Shuffle' })).toBeVisible();
  await expect(page.getByText(/free today, then \$8 for 25/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy a vizzy prompt' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share chart' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remix this chart' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Export' }).first().click();
  await expect(page.getByRole('dialog', { name: 'Export' }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Copy as PNG/i }).first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Export' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /pin for later|unpin/i }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Speak' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Site' })).toBeVisible();
  await expect(page.locator('nav[aria-label="Site"]')).toContainText(/Sign in|account/);
  await expect(page.getByRole('link', { name: 'Agents' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep with Google' })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Keep this pack');
  await expect(page.locator('body')).not.toContainText('that pack');
});

test('export sheet stays on a phone screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Export' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Export' });
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(391);
  expect(box!.y + box!.height).toBeLessThanOrEqual(845);
  await expect(page.getByRole('button', { name: /Copy as PNG/i })).toBeVisible();
  await page.getByRole('button', { name: 'Close export' }).last().click();
  await expect(dialog).toHaveCount(0);
});

test('agents can find the contract', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBeTruthy();
  const robotsBody = await robots.text();
  expect(robotsBody).toMatch(/llms\.txt|Allow: \//);
  expect(robotsBody).toContain('Disallow: /me');

  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.ok()).toBeTruthy();
  const map = await sitemap.text();
  expect(map).toContain(`/c/${PIECES[0].slug}`);
  expect(map).toContain('/llms.txt');
  expect(map).toContain('/agents');
  expect(map).toContain('/openapi.json');
  expect(map).toContain('/schema/chart-config.v1.json');

  const llms = await request.get('/llms.txt');
  expect(llms.ok()).toBeTruthy();
  const llmsBody = await llms.text();
  expect(llmsBody).toContain('POST https://vizzy.run/api/compose');
  expect(llmsBody).toContain('https://vizzy.run/agents');
  expect(llmsBody).toContain('Authorization: Bearer');

  const schema = await request.get('/schema/chart-config.v1.json');
  expect(schema.ok()).toBeTruthy();
  const body = (await schema.json()) as { $id?: string; title?: string };
  expect(body.$id).toBe('https://vizzy.run/schema/chart-config.v1.json');
  expect(body.title).toBe('Vizzy ChartConfig');

  const index = await request.get('/api');
  expect(index.ok()).toBeTruthy();
  const api = (await index.json()) as { ok?: boolean; schema?: string; compose?: { path?: string }; openapi?: string };
  expect(api.ok).toBe(true);
  expect(api.compose?.path).toBe('/api/compose');
  expect(api.openapi).toMatch(/openapi\.json/);

  const compose = await request.get('/api/compose');
  const composeBody = (await compose.json()) as { schema?: string; docs?: string; openapi?: string };
  expect(composeBody.schema).toMatch(/chart-config\.v1\.json/);
  expect(composeBody.docs).toMatch(/llms\.txt/);
  expect(composeBody.openapi).toMatch(/openapi\.json/);

  const publish = await request.get('/api/publish');
  expect(publish.ok()).toBeTruthy();
  const publishBody = (await publish.json()) as { use?: string };
  expect(publishBody.use).toMatch(/Bearer/);

  const openapi = await request.get('/openapi.json');
  expect(openapi.ok()).toBeTruthy();
  const spec = (await openapi.json()) as {
    openapi?: string;
    paths?: Record<string, { post?: { operationId?: string } }>;
  };
  expect(spec.openapi).toMatch(/^3\./);
  expect(spec.paths?.['/api/compose']?.post?.operationId).toBe('composeChart');
  expect(spec.paths?.['/api/publish']?.post?.operationId).toBe('publishChart');
  expect(spec.paths?.['/api/quota']).toBeTruthy();

  const badPublish = await request.post('/api/publish', { data: { title: 'No rows' } });
  expect(badPublish.status()).toBe(400);
  const badBody = (await badPublish.json()) as { ok?: boolean; issues?: unknown[] };
  expect(badBody.ok).toBe(false);
  expect(Array.isArray(badBody.issues)).toBe(true);
});

test('agents page is the repo contract', async ({ page }) => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const root = fs.readFileSync(path.join(__dirname, '../../../AGENTS.md'), 'utf8');
  const copy = fs.readFileSync(path.join(__dirname, '../content/AGENTS.md'), 'utf8');
  expect(copy).toBe(root);

  await page.goto('/agents');
  await expect(page.getByRole('heading', { name: 'vizzy for agents' })).toBeVisible();
  await expect(page.getByText('Do not invent D3')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCount(1);
});

test('terms still restores by checkout email', async ({ page }) => {
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Terms' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send a restore link' })).toBeVisible();
  await expect(page.locator('nav[aria-label="Site"]')).toContainText(/Sign in|account/);
  await expect(page.getByRole('button', { name: 'Keep with Google' })).toHaveCount(0);
});
