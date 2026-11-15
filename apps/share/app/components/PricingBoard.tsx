'use client';

import { useState } from 'react';
import { PACK_CREDITS, PACK_PRICE_LABEL } from '../../lib/pack';
import { startPackCheckout, startWriterCheckout } from '../../lib/start-checkout';
import {
  FREE_PLAN_POINTS,
  WRITER_BENEFITS,
  WRITER_MONTHLY_LABEL,
  WRITER_YEARLY_LABEL,
  type WriterInterval,
} from '../../lib/writer-plan';

export function PricingBoard({
  notice,
  writer,
}: {
  notice?: string;
  writer?: boolean;
}) {
  const [buying, setBuying] = useState<'pack' | WriterInterval | null>(null);
  const [fail, setFail] = useState(notice ?? '');

  async function buyPack() {
    setBuying('pack');
    setFail('');
    try {
      window.location.assign(await startPackCheckout());
    } catch (error) {
      setFail(error instanceof Error ? error.message : 'Could not start checkout');
      setBuying(null);
    }
  }

  async function buyWriter(interval: WriterInterval) {
    setBuying(interval);
    setFail('');
    try {
      window.location.assign(await startWriterCheckout(interval));
    } catch (error) {
      setFail(error instanceof Error ? error.message : 'Could not start checkout');
      setBuying(null);
    }
  }

  return (
    <div className="pricing-board">
      {writer ? <p className="pricing-writer-on">You&apos;re on Writer. Charts are unlimited.</p> : null}
      <div className="pricing-grid">
        <article className="pricing-card" aria-labelledby="plan-free">
          <p className="paywall-kicker">Free</p>
          <h2 id="plan-free" className="pricing-name">
            3 a day
          </h2>
          <p className="pricing-price">$0</p>
          <ul className="pricing-points">
            {FREE_PLAN_POINTS.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </article>
        <article className="pricing-card is-live" aria-labelledby="plan-pack">
          <p className="paywall-kicker">Live</p>
          <h2 id="plan-pack" className="pricing-name">
            {PACK_CREDITS} charts
          </h2>
          <p className="pricing-price">
            {PACK_PRICE_LABEL} <span>once</span>
          </p>
          <ul className="pricing-points">
            <li>{PACK_CREDITS} charts on this account</li>
            <li>Same checkout as the homepage</li>
            <li>Spend them whenever</li>
          </ul>
          <button type="button" className="compose-hero-submit is-amber" onClick={() => void buyPack()} disabled={buying !== null}>
            {buying === 'pack' ? 'Opening…' : `Buy ${PACK_CREDITS} for ${PACK_PRICE_LABEL}`}
          </button>
        </article>
        <article className="pricing-card is-draft" id="writer" aria-labelledby="plan-writer">
          <p className="paywall-kicker">Draft</p>
          <h2 id="plan-writer" className="pricing-name">
            Writer
          </h2>
          <p className="pricing-price">
            {WRITER_MONTHLY_LABEL} <span>or {WRITER_YEARLY_LABEL}</span>
          </p>
          <ul className="pricing-points">
            {WRITER_BENEFITS.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
          <div className="pricing-writer-actions">
            <button type="button" className="compose-hero-submit is-primary" onClick={() => void buyWriter('month')} disabled={buying !== null}>
              {buying === 'month' ? 'Opening…' : `Monthly ${WRITER_MONTHLY_LABEL}`}
            </button>
            <button type="button" className="paywall-compare" onClick={() => void buyWriter('year')} disabled={buying !== null}>
              {buying === 'year' ? 'Opening…' : `Yearly ${WRITER_YEARLY_LABEL}`}
            </button>
          </div>
          <p className="paywall-draft">Draft prices. Not live. Checkout stays in Stripe test mode.</p>
        </article>
      </div>
      {fail ? (
        <p className="paywall-fail" role="alert">
          {fail}
        </p>
      ) : null}
    </div>
  );
}
