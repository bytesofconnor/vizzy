'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { KickerDust, useKickerTap } from './KickerDust';

export function NavDustLink({
  href,
  className,
  children,
  title,
  ariaLabel,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  title?: string;
  ariaLabel?: string;
}) {
  const { tap, onPointerDown } = useKickerTap();

  return (
    <Link
      href={href}
      className={['kicker-nav-link', className, tap ? 'is-tap' : ''].filter(Boolean).join(' ')}
      title={title}
      aria-label={ariaLabel}
      onPointerDown={onPointerDown}
    >
      <span className="kicker-link-label">
        {children}
        <KickerDust />
      </span>
    </Link>
  );
}
