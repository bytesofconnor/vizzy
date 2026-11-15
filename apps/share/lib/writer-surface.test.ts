import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homepageQuotaText, type QuotaSnapshot } from './quota-note';
import { showWriterPaywall, writerPlanEnabled } from './writer-plan';
import { WriterPaywall } from '../app/components/WriterPaywall';
import { PricingBoard } from '../app/components/PricingBoard';

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => createElement('a', { href }, children),
}));

vi.mock('./billing', () => ({
  signedInNav: async () => ({}),
  getAccount: async () => null,
}));

import PricingPage from '../app/pricing/page';

function quota(freeLeft: number): QuotaSnapshot {
  return {
    configured: true,
    canCompose: freeLeft > 0,
    freeLeft,
    credits: 0,
    unlimited: false,
  };
}

describe('writer paywall', () => {
  beforeEach(() => {
    delete process.env.WRITER_PLAN;
  });

  it('stays off unless WRITER_PLAN is 1', () => {
    expect(writerPlanEnabled()).toBe(false);
    process.env.WRITER_PLAN = '1';
    expect(writerPlanEnabled()).toBe(true);
  });

  it('shows the paywall at the free limit when the flag is on', () => {
    expect(showWriterPaywall(false, true)).toBe(false);
    expect(showWriterPaywall(true, false)).toBe(false);
    expect(homepageQuotaText(quota(0))).toContain('No free charts today');
    expect(homepageQuotaText(quota(3))).toContain('3 free today, then $8 for 25');

    const hidden = renderToStaticMarkup(createElement('div'));
    expect(hidden).not.toContain('The chart you were making');

    expect(showWriterPaywall(true, true)).toBe(true);
    const html = renderToStaticMarkup(
      createElement(WriterPaywall, {
        chartTitle: 'Unemployment by state',
        prompt: 'unemployment rate by US state',
        rows: [{ y: 4 }, { y: 9 }],
      })
    );
    expect(html).toContain('Unemployment by state');
    expect(html).toContain('unemployment rate by US state');
    expect(html).toContain('No watermark or branding');
    expect(html).toContain('Unlimited charts');
    expect(html).toContain('A Library of live-updating charts');
    expect(html).toContain('Custom brand colors and fonts');
    expect(html).toContain('Auto-refreshing embeds');
    expect(html).toContain('Buy 25 for $8');
    expect(html).toContain('Compare with Writer');
    expect(html).toContain('href="/pricing"');
  });

  it('renders Free, the live pack, and draft Writer', () => {
    const html = renderToStaticMarkup(createElement(PricingBoard, {}));
    expect(html).toContain('Free');
    expect(html).toContain('3 a day');
    expect(html).toContain('25 charts');
    expect(html).toContain('Buy 25 for $8');
    expect(html).toContain('Writer');
    expect(html).toContain('$8/mo');
    expect(html).toContain('$72/yr');
    expect(html).toContain('Draft prices');
    expect(html).toContain('No watermark or branding');
  });

  it('does not publish the pricing page when the flag is off', async () => {
    await expect(PricingPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renders the pricing page when the flag is on', async () => {
    process.env.WRITER_PLAN = '1';
    const html = renderToStaticMarkup(await PricingPage({ searchParams: Promise.resolve({}) }));
    expect(html).toContain('Free, a pack, or Writer');
    expect(html).toContain('Buy 25 for $8');
    expect(html).toContain('$8/mo');
    expect(html).toContain('$72/yr');
    expect(html).toContain('Draft prices');
  });
});
