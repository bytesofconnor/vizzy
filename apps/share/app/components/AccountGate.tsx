'use client';

import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { promptGoogleSignIn, takeGoogleCredential } from './google-sign-in';

export type AccountMoment = {
  kind: 'save' | 'share' | 'embed' | 'allowance';
  run: () => void;
};

type AccountGateApi = {
  signedIn: boolean;
  requireAccount: (moment: AccountMoment) => boolean;
};

const COPY: Record<AccountMoment['kind'], { title: string; detail: string }> = {
  save: {
    title: 'Sign in to save this chart',
    detail: 'The chart stays here. Google adds it to your library.',
  },
  share: {
    title: 'Sign in to share this chart',
    detail: 'The chart stays here.',
  },
  embed: {
    title: 'Sign in to embed this chart',
    detail: 'The chart stays here.',
  },
  allowance: {
    title: 'Sign in to keep charting',
    detail: 'Free charts for this visit are used.',
  },
};

const AccountContext = createContext<AccountGateApi | null>(null);

const idleGate: AccountGateApi = {
  signedIn: false,
  requireAccount: () => false,
};

export function useAccountGate(): AccountGateApi {
  return useContext(AccountContext) ?? idleGate;
}

export function AccountGate({
  signedIn: initialSignedIn,
  children,
}: {
  signedIn: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const titleId = useId();
  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const [pending, setPending] = useState<AccountMoment | null>(null);
  const [fail, setFail] = useState('');
  const [busy, setBusy] = useState(false);
  const signedInRef = useRef(initialSignedIn);
  const armedRef = useRef(false);
  const busyRef = useRef(false);
  const pendingRef = useRef<AccountMoment | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);
  pendingRef.current = pending;

  useEffect(() => {
    let alive = true;
    void fetch('/api/quota', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body: unknown) => {
        if (!alive || typeof body !== 'object' || body === null) {
          return;
        }
        const quota = body as { configured?: boolean; saved?: boolean; unlimited?: boolean };
        if (quota.saved === true || quota.unlimited === true) {
          signedInRef.current = true;
          setSignedIn(true);
          return;
        }
        if (quota.configured === true) {
          armedRef.current = true;
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (pending) {
      return;
    }
    releaseRef.current?.();
    releaseRef.current = null;
  }, [pending]);

  useEffect(() => {
    if (!pending) {
      return;
    }
    const previous = document.activeElement;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPending(null);
        setFail('');
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous instanceof HTMLElement) {
        previous.focus();
      }
    };
  }, [pending]);

  async function finish(credential: string) {
    if (busyRef.current) {
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setFail('');
    try {
      const response = await fetch('/api/save/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const body: unknown = await response.json();
      const ok = typeof body === 'object' && body !== null && 'ok' in body && body.ok === true;
      if (!response.ok || !ok) {
        const message =
          typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
            ? body.error
            : 'Could not sign in';
        setFail(message);
        busyRef.current = false;
        setBusy(false);
        return;
      }
      signedInRef.current = true;
      setSignedIn(true);
      const run = pendingRef.current?.run;
      setPending(null);
      setBusy(false);
      busyRef.current = false;
      run?.();
      router.refresh();
    } catch {
      setFail('Could not sign in');
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function startGoogle() {
    setFail('');
    releaseRef.current?.();
    releaseRef.current = takeGoogleCredential((credential) => {
      void finish(credential);
    });
    try {
      await promptGoogleSignIn(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
    } catch (error) {
      releaseRef.current?.();
      releaseRef.current = null;
      setFail(error instanceof Error ? error.message : 'Could not sign in');
    }
  }

  const api: AccountGateApi = {
    signedIn,
    requireAccount(moment) {
      if (signedInRef.current || !armedRef.current) {
        return false;
      }
      setFail('');
      setPending(moment);
      // TODO: signup_prompt_shown is not a funnel event, so track() cannot record this prompt.
      return true;
    },
  };

  const copy = pending ? COPY[pending.kind] : null;

  return (
    <AccountContext.Provider value={api}>
      {children}
      {copy ? (
        <div className="signin-layer">
          <button
            type="button"
            className="signin-backdrop"
            aria-label="Close sign-in"
            onClick={() => {
              setPending(null);
              setFail('');
            }}
          />
          <div className="signin-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
            <h2 id={titleId} className="signin-title">
              {copy.title}
            </h2>
            <p className="signin-detail">{copy.detail}</p>
            <button type="button" className="signin-google" disabled={busy} onClick={() => void startGoogle()}>
              {busy ? 'Signing in…' : 'Sign in with Google'}
            </button>
            {fail ? (
              <p role="alert" className="signin-fail">
                {fail}
              </p>
            ) : null}
            <button
              type="button"
              className="signin-later"
              onClick={() => {
                setPending(null);
                setFail('');
              }}
            >
              Not now
            </button>
          </div>
        </div>
      ) : null}
    </AccountContext.Provider>
  );
}
