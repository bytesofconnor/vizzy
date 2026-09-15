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
        login_uri?: string;
        use_fedcm_for_prompt?: boolean;
        itp_support?: boolean;
      }) => void;
      prompt: () => void;
      renderButton: (
        parent: HTMLElement,
        options: {
          type?: 'standard' | 'icon';
          theme?: 'outline' | 'filled_blue' | 'filled_black';
          size?: 'large' | 'medium' | 'small';
          text?: 'signin_with' | 'continue_with' | 'signin';
          ux_mode?: 'popup' | 'redirect';
        }
      ) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

let gisInit = false;

export function SaveGoogle({ compact = false }: { compact?: boolean }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const painted = useRef(false);
  const [google, setGoogle] = useState<GoogleAccounts | null>(null);
  const [loopback, setLoopback] = useState(false);
  const [fail, setFail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoopback(window.location.hostname === '127.0.0.1');
  }, []);

  useEffect(() => {
    if (!clientId) {
      return;
    }
    if (window.google) {
      setGoogle(window.google);
      return;
    }
    const prior = document.querySelector(`script[src="${SOURCE}"]`);
    const onLoad = () => {
      setGoogle(window.google ?? null);
    };
    if (prior) {
      prior.addEventListener('load', onLoad);
      if (window.google) {
        setGoogle(window.google);
      }
      return () => prior.removeEventListener('load', onLoad);
    }
    const script = document.createElement('script');
    script.src = SOURCE;
    script.async = true;
    script.addEventListener('load', onLoad);
    document.head.appendChild(script);
    return () => script.removeEventListener('load', onLoad);
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !google || !hostRef.current || painted.current) {
      return;
    }
    if (!gisInit) {
      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          void keep(response.credential);
        },
        auto_select: false,
        ux_mode: 'redirect',
        login_uri: `${window.location.origin}/api/save/google`,
        use_fedcm_for_prompt: false,
        itp_support: true,
      });
      gisInit = true;
    }
    google.accounts.id.renderButton(hostRef.current, {
      type: 'standard',
      theme: 'outline',
      size: compact ? 'small' : 'medium',
      text: 'signin',
      ux_mode: 'redirect',
    });
    painted.current = true;
  }, [clientId, compact, google]);

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
          : 'Could not sign in';
      setFail(message);
    } catch {
      setFail('Could not sign in');
    }
    setBusy(false);
  }

  if (!clientId) {
    return null;
  }

  const face = busy ? 'Signing in…' : 'Sign in';

  if (loopback) {
    if (compact) {
      return (
        <span className="gis-wrap" title="Use http://localhost:3456 to sign in with Google.">
          <span className="gis-face">{face}</span>
        </span>
      );
    }
    return (
      <span role="alert" className="gis-fail">
        Use http://localhost:3456 to sign in with Google.
      </span>
    );
  }

  return (
    <>
      <span className={compact ? 'gis-wrap gis-wrap-kicker' : 'gis-wrap'}>
        <span className="gis-face" aria-hidden="true">
          {face}
        </span>
        <span ref={hostRef} className="gis-hit" />
      </span>
      {fail && !compact ? (
        <span role="alert" className="gis-fail">
          {fail}
        </span>
      ) : null}
    </>
  );
}
