'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { bootGoogleSignIn, registerNavGoogle } from './google-sign-in';

const SOURCE = 'https://accounts.google.com/gsi/client';

export function SaveGoogle({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const hostRef = useRef<HTMLSpanElement | null>(null);
  const painted = useRef(false);
  const keepRef = useRef<(credential: string) => void>(() => {});
  const [google, setGoogle] = useState<NonNullable<Window['google']> | null>(null);
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
    registerNavGoogle((credential) => {
      keepRef.current(credential);
    });
  }, []);

  useEffect(() => {
    if (!clientId || !google || !hostRef.current || painted.current) {
      return;
    }
    bootGoogleSignIn(clientId);
    google.accounts.id.renderButton(hostRef.current, {
      type: 'standard',
      theme: 'outline',
      size: compact ? 'small' : 'medium',
      text: 'signin',
      ux_mode: 'popup',
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
        router.refresh();
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

  keepRef.current = (credential: string) => {
    void keep(credential);
  };

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
