'use client';

import type { RefObject } from 'react';

export function HeroTypewriter({
  display,
  measureRef,
}: {
  display: string;
  measureRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div ref={measureRef} className="compose-hero-type" aria-hidden="true">
      <span className="compose-hero-type-text">{display || '\u00a0'}</span>
      <span className="compose-hero-cursor" />
    </div>
  );
}
