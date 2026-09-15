'use client';

import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { PACK_CREDITS, PACK_PRICE_LABEL } from '../../lib/pack';
import type { ChartSeed } from '../../lib/seed';
import { DUST, STUDIO } from '../../lib/theme';
import { SpeakPrompt } from './SpeakPrompt';

const DRAW_HEIGHTS = [42, 58, 31, 78, 48, 66, 92, 38] as const;

const HINTS = [
  'Southampton goals this season',
  'July cash by month. Paste a table, or a source link.',
  'Churn the week we raised prices',
  'ARR by quarter, last two years',
  'Wins vs expected goals, this league',
  'Headcount by team, this year',
  'Paste a table, or a source link.',
] as const;

type Quota = {
  configured: boolean;
  canCompose: boolean;
  freeLeft: number;
  credits: number;
  unlimited?: boolean;
  saved?: boolean;
  justPaid?: boolean;
  offerGoogle?: boolean;
  packCredits: number;
  packPriceLabel: string;
};

export function ComposeBox({
  error,
  askPay,
  seed,
}: {
  error?: string;
  askPay?: boolean;
  seed?: ChartSeed;
}) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(error ?? '');
  const [pay, setPay] = useState(Boolean(askPay));
  const [quota, setQuota] = useState<Quota | null>(null);
  const [buying, setBuying] = useState(false);
  const [hint, setHint] = useState(0);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    let cancel = false;
    void fetch('/api/quota')
      .then((response) => response.json())
      .then((body: unknown) => {
        if (cancel || !isQuota(body)) {
          return;
        }
        setQuota(body);
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (seed || held || prompt.length > 0) {
      return;
    }
    const reduce =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      return;
    }
    const id = window.setInterval(() => {
      setHint((index) => (index + 1) % HINTS.length);
    }, 2800);
    return () => window.clearInterval(id);
  }, [held, prompt, seed]);

  async function submit() {
    const asked = prompt.trim();
    if (busy || asked.length < 3) {
      return;
    }

    setBusy(true);
    setFail('');
    setPay(false);

    try {
      const response = await fetch('/api/compose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(seed ? { prompt: asked, seed } : { prompt: asked }),
      });
      const body: unknown = await response.json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'ok' in body &&
        body.ok === true &&
        'url' in body &&
        typeof body.url === 'string'
      ) {
        window.location.assign(body.url);
        return;
      }

      const message =
        typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'Could not draw that';
      setFail(message);
      if (response.status === 402 || (typeof body === 'object' && body !== null && 'pay' in body && body.pay === true)) {
        setPay(true);
      }
    } catch {
      setFail('Could not draw that');
    }

    setBusy(false);
  }

  async function buy() {
    setBuying(true);
    setFail('');
    try {
      const response = await fetch('/api/checkout', { method: 'POST' });
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null && 'url' in body && typeof body.url === 'string') {
        window.location.assign(body.url);
        return;
      }
      const message =
        typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'Could not start checkout';
      setFail(message);
    } catch {
      setFail('Could not start checkout');
    }
    setBuying(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submit();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form
      id={seed ? 'again' : 'make-one'}
      onSubmit={onSubmit}
      style={{ marginTop: seed ? 14 : 16 }}
      aria-busy={busy}
    >
      <div style={{ maxWidth: 560 }}>
        <label
          htmlFor={seed ? 'again-prompt' : 'prompt'}
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            fontSize: 12,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--mute)',
            marginBottom: 10,
          }}
        >
          {seed ? 'Try another pass' : 'Make one'}
        </label>
        <textarea
          id={seed ? 'again-prompt' : 'prompt'}
          name="prompt"
          required
          minLength={3}
          maxLength={4000}
          rows={2}
          disabled={busy}
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onFocus={() => setHeld(true)}
          onBlur={() => setHeld(false)}
          onKeyDown={onKeyDown}
          placeholder={seed ? 'Sort by goals. Drop the 1s. Make it a line.' : (HINTS[hint] ?? HINTS[0])}
          style={{
            display: 'block',
            width: '100%',
            resize: 'vertical',
            border: 0,
            borderBottom: '1px solid var(--rule)',
            background: 'transparent',
            color: 'var(--ink)',
            font: 'inherit',
            fontSize: 16,
            lineHeight: 1.45,
            padding: '10px 0',
            opacity: busy ? 0.55 : 1,
          }}
        />
        {busy ? null : (
          <p className="compose-actions">
            <button type="submit">{seed ? 'Draw' : 'Make chart'}</button>
            <SpeakPrompt disabled={busy} onText={setPrompt} />
          </p>
        )}
        {!busy ? <QuotaLine quota={quota} pay={pay} buying={buying} revise={Boolean(seed)} onBuy={() => void buy()} /> : null}
        {fail && !busy ? (
          <p
            role="alert"
            style={{
              fontFamily: 'var(--font-mono), ui-monospace, monospace',
              fontSize: 12,
              color: 'var(--mute)',
              margin: '10px 0 0',
            }}
          >
            {fail}
          </p>
        ) : null}
      </div>
      {busy ? (
        <div className="compose-draw" aria-live="polite">
          <p>Drawing</p>
          <div className="compose-draw-plot" aria-hidden="true">
            {DUST.map((tone, index) => (
              <span
                key={tone}
                style={{
                  height: `${DRAW_HEIGHTS[index] ?? 40}%`,
                  background: index === 6 ? STUDIO.ink : tone,
                  animationDelay: `${index * 0.11}s`,
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}

function QuotaLine({
  quota,
  pay,
  buying,
  revise,
  onBuy,
}: {
  quota: Quota | null;
  pay: boolean;
  buying: boolean;
  revise: boolean;
  onBuy: () => void;
}) {
  const pack = `${quota?.packPriceLabel ?? PACK_PRICE_LABEL} for ${quota?.packCredits ?? PACK_CREDITS}`;
  const credits = quota?.credits ?? 0;
  const justPaid = Boolean(quota?.justPaid);
  const unlimited = Boolean(quota?.unlimited);
  const saved = Boolean(quota?.saved);

  let copy = revise
    ? `Uses a chart. ${pack} after the free ones.`
    : `Paste a source link if you have one. ${pack} after the free ones.`;
  if (justPaid && credits > 0) {
    copy = `${credits} chart${credits === 1 ? ' is' : 's are'} on this browser now.`;
  } else if (quota?.configured && credits > 0 && unlimited) {
    copy = `${credits} charts left. You can also draw whenever.`;
  } else if (unlimited) {
    copy = 'You can draw whenever.';
  } else if (quota?.configured && credits > 0) {
    copy = `${credits} paid chart${credits === 1 ? '' : 's'} left.`;
  } else if (quota?.configured) {
    copy =
      quota.freeLeft > 0
        ? revise
          ? `${quota.freeLeft} free today. Another pass uses one.`
          : `${quota.freeLeft} free today. Then ${pack}.`
        : quota.offerGoogle
          ? `No free charts left today. Sign in if you already have charts, or ${pack}.`
          : `No free charts left today. ${pack}.`;
  }

  const showBuy = !unlimited && !justPaid && (pay || Boolean(quota?.configured));

  return (
    <p
      style={{
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontSize: 12,
        color: 'var(--mute)',
        margin: '10px 0 0',
        lineHeight: 1.45,
      }}
    >
      {copy}
      {saved || (quota?.configured && (credits > 0 || unlimited)) ? (
        <>
          {' '}
          <Link href="/me">See usage</Link>
        </>
      ) : null}
      {showBuy ? (
        <>
          {' '}
          <button type="button" onClick={onBuy} disabled={buying}>
            {buying
              ? 'Opening…'
              : quota && quota.credits > 0
                ? `Buy ${quota.packCredits} more`
                : `Buy ${quota?.packCredits ?? PACK_CREDITS}`}
          </button>
        </>
      ) : null}
    </p>
  );
}

function isQuota(value: unknown): value is Quota {
  return (
    typeof value === 'object' &&
    value !== null &&
    'configured' in value &&
    typeof value.configured === 'boolean' &&
    'canCompose' in value &&
    typeof value.canCompose === 'boolean' &&
    'freeLeft' in value &&
    typeof value.freeLeft === 'number' &&
    'credits' in value &&
    typeof value.credits === 'number'
  );
}
