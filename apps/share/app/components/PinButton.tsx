'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useKickerTap } from './KickerDust';
import { PinMark } from './PinMark';

export function PinButton({ slug, title }: { slug: string; title: string }) {
  const tipId = useId();
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spoken, setSpoken] = useState(false);
  const spokenTimer = useRef<number>(0);
  const { tap, onPointerDown } = useKickerTap();

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
      window.clearTimeout(spokenTimer.current);
    };
  }, [slug]);

  function flashTip() {
    window.clearTimeout(spokenTimer.current);
    setSpoken(true);
    spokenTimer.current = window.setTimeout(() => setSpoken(false), 1400);
  }

  async function toggle() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const next = !pinned;
    setPinned(next);
    flashTip();
    try {
      const response = await fetch('/api/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, title, pinned: next }),
      });
      const body = (await response.json()) as { ok?: boolean; pinned?: boolean; error?: string };
      if (!response.ok || !body.ok) {
        setPinned(!next);
        setError(body.error || 'Could not save');
        return;
      }
      setPinned(Boolean(body.pinned));
    } catch {
      setPinned(!next);
      setError('Could not save');
    } finally {
      setBusy(false);
    }
  }

  const label = pinned ? 'Remove from saved' : 'Save for later';
  const tip = pinned ? 'Saved for later' : 'Save for later';

  return (
    <span className="pin-control">
      <button
        type="button"
        className={['pin-button', pinned ? 'is-on' : '', tap ? 'is-tap' : ''].filter(Boolean).join(' ')}
        aria-pressed={pinned}
        aria-label={label}
        aria-describedby={tipId}
        onPointerDown={onPointerDown}
        onClick={() => void toggle()}
      >
        <PinMark on={pinned} />
      </button>
      <span id={tipId} role="tooltip" className={spoken ? 'pin-tip is-shown' : 'pin-tip'}>
        {spoken ? tip : label}
      </span>
      {error ? <span className="pin-error">{error}</span> : null}
    </span>
  );
}
