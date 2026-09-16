'use client';

import Link from 'next/link';
import { KickerDust, useKickerTap } from './KickerDust';

export function VizzyHomeLink({ current = false }: { current?: boolean }) {
  const { tap, onTap } = useKickerTap();

  return (
    <Link
      href="/"
      className={['kicker-brand', tap ? 'is-tap' : ''].filter(Boolean).join(' ')}
      aria-current={current ? 'page' : undefined}
      onClick={onTap}
    >
      <span className="kicker-link-label">
        Vizzy
        <KickerDust />
      </span>
    </Link>
  );
}
