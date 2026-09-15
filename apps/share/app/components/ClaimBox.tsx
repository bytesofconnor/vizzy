'use client';

import { FormEvent, useState } from 'react';

export function ClaimBox() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [claimUrl, setClaimUrl] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const asked = email.trim();
    if (busy || asked.length < 3) {
      return;
    }
    setBusy(true);
    setNote('');
    setClaimUrl('');
    try {
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: asked }),
      });
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null && 'ok' in body && body.ok === true) {
        const url =
          'claimUrl' in body && typeof body.claimUrl === 'string' ? body.claimUrl : '';
        setClaimUrl(url);
        setNote(url ? 'Email isn’t configured locally. Use the link.' : 'If that email paid, a link is on the way.');
      } else {
        const message =
          typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
            ? body.error
            : 'Could not send that';
        setNote(message);
      }
    } catch {
      setNote('Could not send that');
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} style={{ marginTop: 18, maxWidth: 560 }}>
      <p
        style={{
          fontFamily: 'var(--font-mono), ui-monospace, monospace',
          fontSize: 11,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--mute)',
          margin: '0 0 10px',
        }}
      >
        Another browser
      </p>
      <label
        htmlFor="claim-email"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
        }}
      >
        The email from your first checkout
      </label>
      <input
        id="claim-email"
        type="email"
        required
        disabled={busy}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="The email from your first checkout"
        style={{
          display: 'block',
          width: '100%',
          border: 0,
          borderBottom: '1px solid var(--rule)',
          background: 'transparent',
          color: 'var(--ink)',
          font: 'inherit',
          fontSize: 16,
          lineHeight: 1.45,
          padding: '0 0 10px',
          outline: 'none',
          opacity: busy ? 0.55 : 1,
        }}
      />
      <p style={{ margin: '12px 0 0' }}>
        <button type="submit" disabled={busy}>
          {busy ? 'Sending…' : 'Send a restore link'}
        </button>
      </p>
      {note ? (
        <p
          style={{
            fontFamily: 'var(--font-mono), ui-monospace, monospace',
            fontSize: 12,
            color: 'var(--mute)',
            margin: '10px 0 0',
            lineHeight: 1.45,
          }}
        >
          {note}
          {claimUrl ? (
            <>
              {' '}
              <a href={claimUrl}>Open it</a>
            </>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}
