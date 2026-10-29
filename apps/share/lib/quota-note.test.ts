import { describe, expect, it } from 'vitest';
import { GET } from '../app/api/quota/route';
import { composeNeedsPay, homepageQuotaText, type QuotaSnapshot } from './quota-note';

function quota(freeLeft: number, extra: Partial<QuotaSnapshot> = {}): QuotaSnapshot {
  return {
    configured: true,
    canCompose: freeLeft > 0 || (extra.credits ?? 0) > 0,
    freeLeft,
    credits: 0,
    unlimited: false,
    ...extra,
  };
}

describe('homepage free count', () => {
  it('says 3 free today when the server still has 3', () => {
    const text = homepageQuotaText(quota(3));
    expect(text).toContain('3 free today');
    expect(text.match(/3 free today/g)).toHaveLength(1);
  });

  it('does not keep saying 3 free today after the server has spent charts', () => {
    expect(homepageQuotaText(quota(2))).toContain('2 free today');
    expect(homepageQuotaText(quota(2))).not.toContain('3 free today');
    expect(homepageQuotaText(quota(1))).toContain('1 free today');
    expect(homepageQuotaText(quota(1))).not.toContain('3 free today');
    expect(homepageQuotaText(quota(0))).toContain('No free charts today');
    expect(homepageQuotaText(quota(0))).not.toContain('3 free today');
  });

  it('does not say 3 free today when free charts are gone and paid credits remain', () => {
    const text = homepageQuotaText(quota(0, { credits: 5, canCompose: true }));
    expect(text).toContain('5 left');
    expect(text).not.toContain('3 free today');
    expect(text).not.toContain('free today');
  });

  it('does not claim a free chart when the server will refuse compose', () => {
    const text = homepageQuotaText(quota(3, { canCompose: false }));
    expect(text).not.toContain('3 free today');
    expect(composeNeedsPay(quota(3, { canCompose: false }))).toBe(true);
    expect(composeNeedsPay(quota(0))).toBe(true);
    expect(composeNeedsPay(quota(3))).toBe(false);
    expect(composeNeedsPay(null)).toBe(false);
  });

  it('does not cache the quota peek', async () => {
    const response = await GET(new Request('https://vizzy.test/api/quota'));
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('keeps the pitch when billing is off, because compose is allowed', () => {
    expect(homepageQuotaText(null)).toContain('3 free today');
    expect(
      homepageQuotaText({
        configured: false,
        canCompose: true,
        freeLeft: 3,
        credits: 0,
        unlimited: true,
      })
    ).toContain('3 free today');
    expect(composeNeedsPay(null)).toBe(false);
  });
});
