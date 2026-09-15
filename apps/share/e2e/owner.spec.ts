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
  await expect(page.getByText('Yours. Draw whenever.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Keep with Google' })).toHaveCount(0);
});
