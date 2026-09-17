'use client';

import {
  busyBarHeights,
  type ComposeProgressEvent,
} from '../../lib/compose-progress';
import { DUST, STUDIO } from '../../lib/theme';

export function ComposeProgressStrip({ progress }: { progress: ComposeProgressEvent | null }) {
  const percent = progress?.progress ?? 8;
  const status = progress?.message ?? 'Starting…';
  const detail = progress?.detail;

  return (
    <div className="compose-hero-progress" aria-live="polite">
      <ProgressBar percent={percent} />
      <p key={status} className="compose-busy-status">
        {status}
      </p>
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
}: {
  variant?: 'hero' | 'studio';
  prompt?: string;
  progress?: ComposeProgressEvent | null;
}) {
  const barCount = DUST.length;
  const heights = busyBarHeights(barCount);
  const percent = progress?.progress ?? 8;
  const status = progress?.message ?? 'Starting…';
  const detail = progress?.detail;

  return (
    <div
      className={variant === 'studio' ? 'compose-busy-stage is-studio' : 'compose-busy-stage is-hero'}
      aria-live="polite"
    >
      <ProgressBar percent={percent} />
      <p key={status} className="compose-busy-status">
        {status}
      </p>
      {detail ? (
        <p className="compose-busy-detail" title={detail}>
          {detail}
        </p>
      ) : null}
      <div className="compose-busy-chart is-card">
        <div className="compose-busy-y" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="compose-busy-plot-wrap">
          <div className="compose-busy-grid" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div
            className="compose-draw-plot compose-busy-plot is-card-plot"
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

function ProgressBar({ percent }: { percent: number }) {
  return (
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
  );
}
