'use client';

import Link from 'next/link';
import { track } from '../../lib/funnel-browser';
import { KickerDust, useKickerTap } from './KickerDust';

export function VizzyHomeLink({ current = false }: { current?: boolean }) {
  const { tap, onPointerDown } = useKickerTap();

  return (
    <Link
      href="/"
      className={['kicker-brand', tap ? 'is-tap' : ''].filter(Boolean).join(' ')}
      aria-current={current ? 'page' : undefined}
      onPointerDown={onPointerDown}
      onClick={() => {
        if (window.location.pathname.startsWith('/c/')) {
          track('shared_compose');
        }
      }}
    >
      <span className="kicker-link-label">
        vizzy
        <KickerDust />
      </span>
    </Link>
  );
}
