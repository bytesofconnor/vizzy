'use client';

import Link from 'next/link';
import { KickerDust, useKickerTap } from './KickerDust';

export function HereMark({
  href,
  children,
  mail = false,
  email,
  className,
}: {
  href: string;
  children: string;
  mail?: boolean;
  email?: string;
  className?: string;
}) {
  const { tap, onPointerDown } = useKickerTap();

  return (
    <Link
      href={href}
      className={['kicker-here', tap ? 'is-tap' : '', mail ? 'kicker-mail' : '', className]
        .filter(Boolean)
        .join(' ')}
      aria-current="page"
      title={mail ? email ?? children : undefined}
      aria-label={mail && email ? `account, ${email}` : undefined}
      onPointerDown={onPointerDown}
    >
      <span className="kicker-link-label">
        {mail ? (
          <>
            <span className="kicker-mail-short">account</span>
            <span className="kicker-mail-full kicker-mail-text">{children}</span>
          </>
        ) : (
          children
        )}
        <KickerDust />
      </span>
    </Link>
  );
}
