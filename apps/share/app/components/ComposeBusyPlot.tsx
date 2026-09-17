'use client';

import { useEffect, useRef, useState } from 'react';
import type { ComposeProgressEvent } from '../../lib/compose-progress';
import { DUST } from '../../lib/theme';

export function ComposeProgressStrip({ progress }: { progress: ComposeProgressEvent | null }) {
  const percent = useLiveProgress(progress?.progress ?? null);
  const status = progress?.message ?? 'Starting…';
  const detail = progress?.detail;

  return (
    <div className="compose-hero-progress" aria-live="polite">
      <ProgressBar percent={percent} />
      <div className="compose-busy-line">
        <InkSpin />
        <p key={status} className="compose-busy-status">
          {status}
        </p>
      </div>
      {detail ? (
        <p className="compose-busy-detail" title={detail}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function ComposeBusyPlot({
  variant = 'hero',
  progress = null,
  chrome = 'full',
}: {
  variant?: 'hero' | 'studio';
  prompt?: string;
  progress?: ComposeProgressEvent | null;
  chrome?: 'full' | 'plot';
}) {
  const percent = useLiveProgress(progress?.progress ?? null);
  const status = progress?.message ?? 'Starting…';
  const detail = progress?.detail;
  const plotOnly = chrome === 'plot';

  return (
    <div
      className={variant === 'studio' ? 'compose-busy-stage is-studio' : 'compose-busy-stage is-hero'}
      aria-live={plotOnly ? 'off' : 'polite'}
    >
      {plotOnly ? null : (
        <>
          <ProgressBar percent={percent} />
          <div className="compose-busy-line">
            <InkSpin />
            <p key={status} className="compose-busy-status">
              {status}
            </p>
          </div>
          {detail ? (
            <p className="compose-busy-detail" title={detail}>
              {detail}
            </p>
          ) : null}
        </>
      )}
      <DustField />
    </div>
  );
}

function DustField() {
  return (
    <div className="compose-dust-field" aria-hidden="true">
      {DUST.map((tone, index) => (
        <i
          key={tone}
          style={{
            background: tone,
            animationDelay: `${index * 0.18}s`,
          }}
        />
      ))}
    </div>
  );
}

function InkSpin() {
  return <i className="compose-ink-spin" aria-hidden="true" />;
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div
      className="compose-busy-progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
      aria-label="Chart generation progress"
    >
      <i style={{ width: `${percent}%` }} />
    </div>
  );
}

function useLiveProgress(reported: number | null): number {
  const [shown, setShown] = useState(() => reported ?? 8);
  const reportedRef = useRef(reported ?? 0);

  useEffect(() => {
    if (reported == null) {
      reportedRef.current = 0;
      setShown(8);
      return;
    }
    reportedRef.current = reported;
    setShown((prev) => (reported + 1 < prev ? reported : Math.max(prev, reported)));
  }, [reported]);

  useEffect(() => {
    if (reported == null) {
      return;
    }
    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      return;
    }
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      setShown((prev) => {
        const floor = reportedRef.current;
        const at = Math.max(prev, floor);
        if (floor >= 99) {
          return Math.min(100, at + 70 * dt);
        }
        const cap = 96;
        const crawl = 2.6 + (cap - at) * 0.28;
        return Math.min(cap, at + crawl * dt);
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reported]);

  return shown;
}
