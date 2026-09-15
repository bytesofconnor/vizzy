'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DUST, STUDIO } from '../../lib/theme';

export function HereMark({
  href,
  children,
  mail = false,
  email,
}: {
  href: string;
  children: string;
  mail?: boolean;
  email?: string;
}) {
  const [tap, setTap] = useState(false);

  return (
    <Link
      href={href}
      className={['kicker-here', tap ? 'is-tap' : '', mail ? 'kicker-mail' : ''].filter(Boolean).join(' ')}
      aria-current="page"
      title={mail ? email ?? children : undefined}
      aria-label={mail && email ? `Account, ${email}` : undefined}
      onClick={() => {
        setTap(true);
        window.setTimeout(() => setTap(false), 800);
      }}
    >
      <span className="kicker-here-label">
        {mail ? (
          <>
            <span className="kicker-mail-short">Account</span>
            <span className="kicker-mail-full kicker-mail-text">{children}</span>
          </>
        ) : (
          children
        )}
        <span className="kicker-dust" aria-hidden="true">
          {DUST.map((tone, index) => (
            <i key={tone} style={{ background: index === 6 ? STUDIO.ink : tone, ['--dust-i']: String(index) }} />
          ))}
        </span>
      </span>
    </Link>
  );
}
