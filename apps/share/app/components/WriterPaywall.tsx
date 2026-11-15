'use client';

import { useState } from 'react';
import { PACK_CREDITS, PACK_PRICE_LABEL } from '../../lib/pack';
import { startPackCheckout } from '../../lib/start-checkout';
import { WRITER_BENEFITS, WRITER_MONTHLY_LABEL, WRITER_YEARLY_LABEL } from '../../lib/writer-plan';

export function WriterPaywall({
  chartTitle,
  prompt,
  rows = [],
}: {
  chartTitle?: string;
  prompt: string;
  rows?: ReadonlyArray<{ y: number | null }>;
}) {
  const [buying, setBuying] = useState(false);
  const [fail, setFail] = useState('');
  const title = chartTitle?.trim() || prompt.trim() || 'This chart';
  const asked = prompt.trim();
  const showAsked = Boolean(asked && asked !== title);
  const bars = barHeights(rows);

  async function buyPack() {
    setBuying(true);
    setFail('');
    try {
      window.location.assign(await startPackCheckout());
    } catch (error) {
      setFail(error instanceof Error ? error.message : 'Could not start checkout');
      setBuying(false);
    }
  }

  return (
    <section className="paywall" aria-labelledby="paywall-title">
      <div className="paywall-chart">
        <p className="paywall-kicker">The chart you were making</p>
        <h2 id="paywall-title" className="paywall-chart-title">
          {title}
        </h2>
        {showAsked ? <p className="paywall-asked">{asked}</p> : null}
        {bars.length > 0 ? (
          <div className="paywall-bars" aria-hidden="true">
            {bars.map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        ) : null}
      </div>
      <div className="paywall-copy">
        <p className="paywall-kicker">Free charts for today are spent</p>
        <p className="paywall-lede">
          Buy {PACK_CREDITS} more for {PACK_PRICE_LABEL}, or look at Writer. Writer is a draft.
        </p>
        <ul className="paywall-benefits">
          {WRITER_BENEFITS.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
        <div className="paywall-actions">
          <button type="button" className="compose-hero-submit is-amber" onClick={() => void buyPack()} disabled={buying}>
            {buying ? 'Opening…' : `Buy ${PACK_CREDITS} for ${PACK_PRICE_LABEL}`}
          </button>
          <a className="paywall-compare" href="/pricing">
            Compare with Writer
          </a>
        </div>
        <p className="paywall-draft">
          Writer draft {WRITER_MONTHLY_LABEL} or {WRITER_YEARLY_LABEL}. The {PACK_PRICE_LABEL} pack is the live checkout.
        </p>
        {fail ? (
          <p className="paywall-fail" role="alert">
            {fail}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function barHeights(rows: ReadonlyArray<{ y: number | null }>): number[] {
  const values = rows.flatMap((row) => (typeof row.y === 'number' && Number.isFinite(row.y) ? [row.y] : [])).slice(0, 8);
  const max = Math.max(...values, 0);
  if (max <= 0) {
    return [];
  }
  return values.map((value) => Math.max(12, Math.round((value / max) * 100)));
}
