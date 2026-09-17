'use client';

import Link from 'next/link';
import { KickerDust, useKickerTap } from './KickerDust';

export function VizzyHomeLink({ current = false }: { current?: boolean }) {
  const { tap, onPointerDown } = useKickerTap();

  return (
    <Link
      href="/"
      className={['kicker-brand', tap ? 'is-tap' : ''].filter(Boolean).join(' ')}
      aria-current={current ? 'page' : undefined}
      onPointerDown={onPointerDown}
    >
      <span className="kicker-link-label">
        vizzy
        <KickerDust />
      </span>
    </Link>
  );
}
