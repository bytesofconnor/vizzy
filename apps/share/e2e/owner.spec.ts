import { expect, test } from '@playwright/test';
import {
  WALLET_COOKIE,
  billingReady,
  convexCall,
  ownerEmail,
  ownerWalletToken,
  site,
  utcDay,
} from './helpers';

test('owner charts are unlimited', async ({ context, page }) => {
  test.skip(!billingReady() || !ownerEmail(), 'Owner email is not configured');

  const token = await ownerWalletToken();
  expect(token, 'no wallet for the owner email').toBeTruthy();

  await context.addCookies([
    {
      name: WALLET_COOKIE,
      value: token as string,
      url: site,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  const before = await page.request.get('/api/quota');
  expect(before.ok()).toBeTruthy();
  const quota = (await before.json()) as {
    unlimited?: boolean;
    credits?: number;
    canCompose?: boolean;
  };
  expect(quota.unlimited).toBe(true);
  expect(quota.canCompose).toBe(true);

  const consumed = await convexCall<{ via: string; credits: number; ok: boolean }>('mutation', 'billing:consume', {
    ipHash: 'e2e-owner',
    day: utcDay(),
    walletToken: token,
  });
  expect(consumed.ok).toBe(true);
  expect(consumed.via).toBe('owner');
  expect(consumed.credits).toBe(quota.credits);

  const after = await page.request.get('/api/quota');
  const next = (await after.json()) as { unlimited?: boolean; credits?: number };
  expect(next.unlimited).toBe(true);
  expect(next.credits).toBe(quota.credits);

  await page.goto('/');
  await expect(page.getByText(/charts left|generate whenever/i)).toBeVisible();
  await expect(page.locator('nav[aria-label="Site"] a[href="/me"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep with Google' })).toHaveCount(0);

  await page.goto('/me');
  await expect(page.getByRole('heading', { name: /charts left|generate whenever|no paid charts/i })).toBeVisible();
  await expect(page.getByText(/signed in as/i)).toHaveCount(0);
  await expect(page.getByRole('button', { name: /buy \d+ more/i })).toBeVisible();
  await expect(page.getByText('Last 14 days', { exact: true })).toBeVisible();

  const published = await page.request.post('/api/publish', {
    headers: { Authorization: `Bearer vizzy_${token}` },
    data: {
      title: 'Owner publish',
      data: [
        { month: 'Jan', n: 1 },
        { month: 'Feb', n: 2 },
      ],
      config: {
        schemaVersion: 1,
        chart: { type: 'bar' },
        dataMapping: { x: 'month', y: 'n' },
      },
      source: { label: 'e2e', method: 'example' },
    },
  });
  expect(published.ok()).toBeTruthy();
  const minted = (await published.json()) as { ok?: boolean; url?: string; pay?: boolean };
  expect(minted.ok).toBe(true);
  expect(minted.url).toMatch(/\/c\/[A-Za-z0-9_-]+$/);
  expect(minted.url).not.toMatch(/\/c\/x\//);
  expect(minted.pay).toBeFalsy();
});
