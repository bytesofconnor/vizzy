'use client';

import { useState } from 'react';
import { PACK_CREDITS, PACK_PRICE_LABEL } from '../../lib/pack';

export function AccountBuy({ more = true }: { more?: boolean }) {
  const [buying, setBuying] = useState(false);
  const [fail, setFail] = useState('');

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

  return (
    <p
      style={{
        fontFamily: 'var(--font-mono), ui-monospace, monospace',
        fontSize: 12,
        color: 'var(--mute)',
        margin: '12px 0 0',
        lineHeight: 1.45,
      }}
    >
      <button type="button" onClick={() => void buy()} disabled={buying}>
        {buying
          ? 'Opening…'
          : more
            ? `Buy ${PACK_CREDITS} more for ${PACK_PRICE_LABEL}`
            : `Buy ${PACK_CREDITS} for ${PACK_PRICE_LABEL}`}
      </button>
      {fail ? (
        <span role="alert">
          {' '}
          {fail}
        </span>
      ) : null}
    </p>
  );
}
