'use client';

import {
  busyBarHeights,
  guessBarCount,
  type ComposeProgressEvent,
} from '../../lib/compose-progress';
import { DUST, STUDIO } from '../../lib/theme';

function trimPrompt(prompt: string, max = 96): string {
  const text = prompt.trim().replace(/\s+/g, ' ');
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

export function ComposeBusyPlot({
  variant = 'default',
  prompt = '',
  progress = null,
}: {
  variant?: 'default' | 'hero' | 'studio';
  prompt?: string;
  progress?: ComposeProgressEvent | null;
}) {
  const echo = prompt.trim();
  const rawCount = progress?.barCount ?? guessBarCount(prompt);
  const inCard = variant === 'hero' || variant === 'studio';
  const barCount = inCard ? DUST.length : Math.min(rawCount, 12);
  const heights = busyBarHeights(barCount);
  const percent = progress?.progress ?? 8;
  const status = progress?.message ?? 'Starting…';
  const detail = progress?.detail;

  return (
    <div className={inCard ? 'compose-hero-busy' : 'compose-draw'} aria-live="polite">
      {echo ? (
        <p className="compose-busy-echo" title={echo}>
          {trimPrompt(echo)}
        </p>
      ) : null}
      <div
        className="compose-busy-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label="Chart generation progress"
      >
        <i style={{ width: `${percent}%` }} />
      </div>
      <p key={status} className="compose-busy-status">
        {status}
      </p>
      {detail ? (
        <p className="compose-busy-detail" title={detail}>
          {detail}
        </p>
      ) : null}
      <div className={['compose-busy-chart', inCard ? 'is-card' : ''].filter(Boolean).join(' ')}>
        <div className="compose-busy-y" aria-hidden="true">
          <span>40</span>
          <span>20</span>
          <span>0</span>
        </div>
        <div className="compose-busy-plot-wrap">
          <div className="compose-busy-grid" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div
            className={['compose-draw-plot', 'compose-busy-plot', inCard ? 'is-card-plot' : '']
              .filter(Boolean)
              .join(' ')}
            aria-hidden="true"
            data-bar-count={String(barCount)}
          >
            {heights.map((height, index) => {
              const tone = DUST[index % DUST.length] ?? DUST[0];
              return (
                <span
                  key={`${barCount}-${index}`}
                  style={{
                    height: `${height}%`,
                    background: index % DUST.length === 6 ? STUDIO.ink : tone,
                    animationDelay: `${index * 0.07}s`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
