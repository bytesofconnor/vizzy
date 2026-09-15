'use client';

import Link from 'next/link';
import { useState } from 'react';
import { DUST, STUDIO } from '../../lib/theme';

export function HereMark({
  href,
  children,
  mail = false,
}: {
  href: string;
  children: string;
  mail?: boolean;
}) {
  const [tap, setTap] = useState(false);

  return (
    <Link
      href={href}
      className={['kicker-here', tap ? 'is-tap' : '', mail ? 'kicker-mail' : ''].filter(Boolean).join(' ')}
      aria-current="page"
      title={mail ? children : undefined}
      onClick={() => {
        setTap(true);
        window.setTimeout(() => setTap(false), 800);
      }}
    >
      {mail ? <span className="kicker-mail-text">{children}</span> : children}
      <span className="kicker-dust" aria-hidden="true">
        {DUST.map((tone, index) => (
          <i key={tone} style={{ background: index === 6 ? STUDIO.ink : tone, ['--dust-i']: String(index) }} />
        ))}
      </span>
    </Link>
  );
}
