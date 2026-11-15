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
  await expect(page.getByRole('button', { name: 'US unemployment since 2000' })).toBeVisible();
  await expect(page.getByRole('button', { name: '30-year mortgage rate' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'CO2 per capita' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'US GDP since 2000' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'S&P 500 last 20 years' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Federal funds rate' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Shuffle' })).toHaveCount(0);
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
  await expect(page.getByRole('button', { name: /save for later|remove from saved/i }).first()).toBeVisible();
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
  expect(map).toContain('/gallery');
  expect(map).toContain('/charts/us-unemployment-rate-since-2000');
  expect(map).not.toContain('/charts/k7H3mQ9xAb12');
  expect(map).not.toContain('/me');
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

test('a seeded chart page renders on the server', async ({ request }) => {
  test.setTimeout(45_000);
  const page = await request.get('/charts/us-unemployment-rate-since-2000');
  expect(page.ok()).toBeTruthy();
  const html = await page.text();
  expect(html).toContain('US unemployment rate since 2000');
  expect(html).toContain('FRED');
  expect(html).toContain('application/ld+json');
  expect(html).toContain('Dataset');
  expect(html).toContain('fred.stlouisfed.org');

  const hidden = await request.get('/charts/k7H3mQ9xAb12');
  expect(hidden.status()).toBe(404);

  const gallery = await request.get('/gallery');
  expect(gallery.ok()).toBeTruthy();
  const index = await gallery.text();
  expect(index).toContain('Economy');
  expect(index).toContain('Climate');
  expect(index).toContain('/charts/us-unemployment-rate-since-2000');
  expect(index).not.toContain('/charts/k7H3mQ9xAb12');
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

function quotaBody(freeLeft: number) {
  return {
    configured: true,
    canCompose: freeLeft > 0,
    freeLeft,
    credits: 0,
    unlimited: false,
    saved: false,
    justPaid: false,
    offerGoogle: false,
    packCredits: 25,
    packPriceLabel: '$8',
  };
}

test('idle free count matches the server before submit', async ({ page }) => {
  await page.route('**/api/quota', async (route) => {
    await route.fulfill({ json: quotaBody(0) });
  });
  let composePosts = 0;
  await page.route('**/api/compose', async (route) => {
    composePosts += 1;
    await route.fulfill({
      status: 402,
      json: { ok: false, error: 'pay', pay: true },
    });
  });

  await page.goto('/');
  const note = page.locator('.compose-bar-note');
  await expect(note).toContainText('No free charts today');
  await expect(note).not.toContainText('3 free today');

  await page.locator('#prompt').fill('Bitcoin price from March to June 2021');
  await page.getByRole('button', { name: 'Generate my chart' }).click();
  await expect(page.getByRole('dialog', { name: 'Sign in to keep charting' })).toBeVisible();
  expect(composePosts).toBe(0);
});

test('three charts do not leave the counter at 3 free today', async ({ page }) => {
  let freeLeft = 3;
  await page.route('**/api/quota', async (route) => {
    await route.fulfill({ json: quotaBody(freeLeft) });
  });
  await page.route('**/api/compose', async (route) => {
    if (freeLeft <= 0) {
      await route.fulfill({
        status: 402,
        json: { ok: false, error: 'pay', pay: true },
      });
      return;
    }
    freeLeft -= 1;
    await route.fulfill({
      json: {
        ok: true,
        url: '/c/reef',
        piece: PIECES[0],
      },
    });
  });

  await page.goto('/');
  const note = page.locator('.compose-bar-note');
  await expect(note).toContainText('3 free today');

  for (const left of [2, 1, 0]) {
    await page.locator('textarea').fill(`Bitcoin price from March to June 2021 ${left}`);
    await page.locator('form button[type="submit"]').click();
    if (left === 0) {
      await expect(note).toContainText('No free charts today');
    } else {
      await expect(note).toContainText(`${left} free today`);
    }
    await expect(note).not.toContainText('3 free today');
  }
});

test('quota peek is not cached', async ({ request }) => {
  const response = await request.get('/api/quota');
  expect(response.ok()).toBeTruthy();
  expect(response.headers()['cache-control']).toContain('no-store');
});

test('signed-out example renders a sourced chart and save signs in to the library', async ({ page }) => {
  const piece = {
    ...PIECES[0],
    slug: 'unemployment',
    title: 'US unemployment since 2000',
    config: {
      ...PIECES[0].config,
      source: {
        label: 'FRED — U.S. unemployment rate',
        method: 'official' as const,
        url: 'https://fred.stlouisfed.org/series/UNRATE',
        retrieved: '2026-11-15',
      },
    },
  };
  await page.route('**/api/quota', async (route) => {
    await route.fulfill({ json: quotaBody(3) });
  });
  await page.route('**/api/compose', async (route) => {
    await route.fulfill({
      json: {
        ok: true,
        url: '/c/unemployment',
        piece,
      },
    });
  });
  let librarySave: { slug?: string; title?: string; pinned?: boolean } | null = null;
  await page.route('**/api/pin**', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: { ok: true, pinned: false } });
      return;
    }
    librarySave = route.request().postDataJSON() as { slug?: string; title?: string; pinned?: boolean };
    await route.fulfill({ json: { ok: true, pinned: true } });
  });
  await page.route('**/api/save/google', async (route) => {
    await route.fulfill({ json: { ok: true, credits: 0, unlimited: false } });
  });
  await page.addInitScript(() => {
    const host = window as Window & {
      __gis?: (response: { credential: string }) => void;
      google?: {
        accounts: {
          id: {
            initialize: (config: { callback: (response: { credential: string }) => void }) => void;
            prompt: () => void;
            renderButton: () => void;
          };
        };
      };
    };
    host.google = {
      accounts: {
        id: {
          initialize(config) {
            host.__gis = config.callback;
          },
          prompt() {
            host.__gis?.({ credential: 'test-credential' });
          },
          renderButton() {},
        },
      },
    };
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const examples = page.getByLabel('Example questions');
  await expect(examples).toBeVisible();
  const desktop = await examples.boundingBox();
  expect(desktop).toBeTruthy();
  expect(desktop!.x).toBeGreaterThanOrEqual(0);
  expect(desktop!.x + desktop!.width).toBeLessThanOrEqual(1280);

  await page.setViewportSize({ width: 390, height: 844 });
  const phone = await examples.boundingBox();
  expect(phone).toBeTruthy();
  expect(phone!.x).toBeGreaterThanOrEqual(-1);
  expect(phone!.x + phone!.width).toBeLessThanOrEqual(391);

  await page.getByRole('button', { name: 'US unemployment since 2000' }).click();
  const slot = page.locator('.home-chart-slot');
  await expect(slot.getByText('Source')).toBeVisible();
  await expect(slot.locator('.source-name')).toContainText('FRED — U.S. unemployment rate');
  expect(librarySave).toBeNull();

  await slot.getByRole('button', { name: 'Save for later' }).click();
  const dialog = page.getByRole('dialog', { name: 'Sign in to save this chart' });
  await expect(dialog).toBeVisible();
  const sheet = await dialog.boundingBox();
  expect(sheet).toBeTruthy();
  expect(sheet!.x).toBeGreaterThanOrEqual(-1);
  expect(sheet!.x + sheet!.width).toBeLessThanOrEqual(391);
  expect(librarySave).toBeNull();

  await dialog.getByRole('button', { name: 'Sign in with Google' }).click();
  await expect(slot.getByRole('button', { name: 'Remove from saved' })).toBeVisible();
  await expect(dialog).toHaveCount(0);
  await expect(slot.locator('.source-name')).toContainText('FRED — U.S. unemployment rate');
  expect(librarySave).toMatchObject({
    slug: 'unemployment',
    title: 'US unemployment since 2000',
    pinned: true,
  });
});

test('terms still restores by checkout email', async ({ page }) => {
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Terms' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send a restore link' })).toBeVisible();
  await expect(page.locator('nav[aria-label="Site"]')).toContainText(/Sign in|account/);
  await expect(page.getByRole('button', { name: 'Keep with Google' })).toHaveCount(0);
});
