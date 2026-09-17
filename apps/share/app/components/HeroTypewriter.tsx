'use client';

import type { RefObject } from 'react';

export function HeroTypewriter({
  display,
  measureRef,
  paused = false,
}: {
  display: string;
  measureRef?: RefObject<HTMLDivElement | null>;
  paused?: boolean;
}) {
  return (
    <div
      ref={measureRef}
      className={paused ? 'compose-hero-type is-paused' : 'compose-hero-type'}
      aria-hidden="true"
    >
      <p className="compose-hero-type-line">
        <span className="compose-hero-type-text">{display || '\u00a0'}</span>
        <span className="compose-hero-cursor" />
      </p>
    </div>
  );
}
