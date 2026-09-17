'use client';

import { useEffect, useState } from 'react';

export function PinButton({ slug, title }: { slug: string; title: string }) {
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    void fetch(`/api/pin?slug=${encodeURIComponent(slug)}`)
      .then((response) => response.json() as Promise<{ pinned?: boolean }>)
      .then((body) => {
        if (alive) {
          setPinned(Boolean(body.pinned));
        }
      })
      .catch(() => {
        if (alive) {
          setPinned(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [slug]);

  async function toggle() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const next = !pinned;
    try {
      const response = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, title, pinned: next }),
      });
      const body = (await response.json()) as { ok?: boolean; pinned?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setError(body.error || 'Could not pin');
        return;
      }
      setPinned(Boolean(body.pinned));
    } catch {
      setError('Could not pin');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="pin-control">
      <button
        type="button"
        className={pinned ? 'pin-button is-on' : 'pin-button'}
        aria-pressed={pinned}
        disabled={busy}
        onClick={() => void toggle()}
      >
        {pinned ? 'Pinned' : 'Pin'}
      </button>
      {error ? <span className="pin-error">{error}</span> : null}
    </span>
  );
}
