'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClientPiece, ComposeProgressEvent } from '../../lib/compose-progress';
import type { Piece } from '../../lib/pieces';
import { seedFromPiece } from '../../lib/seed';
import { ChartFrame } from './ChartFrame';
import { ComposeBox } from './ComposeBox';
import { ComposeBusyPlot, ComposeProgressStrip } from './ComposeBusyPlot';
import { PieceStage } from './PieceStage';

export function HomeCompose({ error, askPay }: { error?: string; askPay?: boolean }) {
  const [piece, setPiece] = useState<Piece | null>(null);
  const [progress, setProgress] = useState<ComposeProgressEvent | null>(null);
  const [draftFresh, setDraftFresh] = useState(false);
  const busy = progress !== null;
  const showStage = busy || Boolean(piece);
  const slotRef = useRef<HTMLDivElement | null>(null);
  const revising = busy && Boolean(piece);

  const onMinted = useCallback((next: ClientPiece) => {
    setDraftFresh(false);
    setPiece(next);
  }, []);

  const onComposeStart = useCallback(({ fresh }: { fresh: boolean }) => {
    setDraftFresh(fresh);
    if (fresh) {
      setPiece(null);
    }
  }, []);

  const onPromptIntent = useCallback(({ fresh }: { fresh: boolean }) => {
    setDraftFresh(fresh);
  }, []);

  useEffect(() => {
    if (!busy || !slotRef.current) {
      return;
    }
    const slot = slotRef.current;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    let live = true;
    const hold = window.setTimeout(() => {
      if (live) {
        driftSlotIntoView(slot, () => live);
      }
    }, 140);
    return () => {
      live = false;
      window.clearTimeout(hold);
    };
  }, [busy]);

  return (
    <ComposeBox
      error={error}
      askPay={askPay}
      variant="hero"
      seed={draftFresh || !piece ? undefined : seedFromPiece(piece)}
      showIdeas={!busy && !piece}
      onBusyProgress={setProgress}
      onComposeStart={onComposeStart}
      onPromptIntent={onPromptIntent}
      onMinted={onMinted}
    >
      {showStage ? (
        <div ref={slotRef} className={busy ? 'home-chart-slot is-drafting' : 'home-chart-slot'}>
          {piece ? (
            <PieceStage
              piece={piece}
              titleId="home-chart-title"
              busy={revising}
              headLead={busy ? <ComposeProgressStrip progress={progress} /> : undefined}
              overlay={
                revising ? <ComposeBusyPlot variant="hero" progress={progress} chrome="plot" /> : undefined
              }
            />
          ) : (
            <ChartFrame head={<ComposeProgressStrip progress={progress} />}>
              <div className="piece-stage-plot">
                <ComposeBusyPlot variant="hero" progress={progress} chrome="plot" />
              </div>
            </ChartFrame>
          )}
        </div>
      ) : null}
    </ComposeBox>
  );
}

function driftSlotIntoView(slot: HTMLElement, isLive: () => boolean) {
  const start = window.scrollY;
  const destination = () => {
    const box = slot.getBoundingClientRect();
    const center = box.top + window.scrollY + box.height * 0.42;
    return Math.max(0, center - window.innerHeight * 0.38);
  };
  if (Math.abs(destination() - start) < 36) {
    return;
  }

  let live = true;
  const stop = () => {
    live = false;
  };
  window.addEventListener('wheel', stop, { passive: true, once: true });
  window.addEventListener('touchstart', stop, { passive: true, once: true });
  window.addEventListener('keydown', stop, { once: true });

  const duration = 1280;
  const origin = performance.now();
  const tick = (now: number) => {
    if (!live || !isLive()) {
      return;
    }
    const t = Math.min(1, (now - origin) / duration);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
    window.scrollTo({ top: start + (destination() - start) * eased, left: 0 });
    if (t < 1) {
      window.requestAnimationFrame(tick);
    }
  };
  window.requestAnimationFrame(tick);
}
