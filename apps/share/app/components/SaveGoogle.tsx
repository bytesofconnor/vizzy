'use client';

import { useEffect, useRef, useState } from 'react';

const SOURCE = 'https://accounts.google.com/gsi/client';

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: { credential: string }) => void;
        auto_select?: boolean;
        ux_mode?: 'popup' | 'redirect';
      }) => void;
      prompt: (momentListener?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

export function SaveGoogle() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const googleRef = useRef<GoogleAccounts | null>(null);
  const [fail, setFail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clientId) {
      return;
    }
    if (window.google) {
      googleRef.current = window.google;
      return;
    }
    const prior = document.querySelector(`script[src="${SOURCE}"]`);
    if (prior) {
      prior.addEventListener('load', () => {
        googleRef.current = window.google ?? null;
      });
      return;
    }
    const script = document.createElement('script');
    script.src = SOURCE;
    script.async = true;
    script.onload = () => {
      googleRef.current = window.google ?? null;
    };
    document.head.appendChild(script);
  }, [clientId]);

  if (!clientId) {
    return null;
  }

  async function keep(credential: string) {
    setBusy(true);
    setFail('');
    try {
      const response = await fetch('/api/save/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const body: unknown = await response.json();
      if (typeof body === 'object' && body !== null && 'ok' in body && body.ok === true) {
        window.location.assign('/');
        return;
      }
      const message =
        typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
          ? body.error
          : 'Could not keep that';
      setFail(message);
    } catch {
      setFail('Could not keep that');
    }
    setBusy(false);
  }

  function onClick() {
    const google = googleRef.current ?? window.google;
    if (!google || !clientId) {
      setFail('Google is still loading.');
      return;
    }
    setFail('');
    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        void keep(response.credential);
      },
      auto_select: false,
      ux_mode: 'popup',
    });
    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        setFail('Could not open Google.');
      }
    });
  }

  return (
    <>
      <button type="button" onClick={onClick} disabled={busy}>
        {busy ? 'Opening…' : 'Keep with Google'}
      </button>
      {fail ? (
        <span role="alert">
          {' '}
          {fail}
        </span>
      ) : null}
    </>
  );
}
