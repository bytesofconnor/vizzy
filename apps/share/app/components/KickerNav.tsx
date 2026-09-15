'use client';

import Link from 'next/link';
import { AccountLink } from './AccountLink';
import { HereMark } from './HereMark';

export function KickerNav({
  here,
  email,
}: {
  here: 'home' | 'account' | 'terms' | 'agents';
  email?: string;
}) {
  return (
    <nav className="kicker-nav" aria-label="Site">
      {here === 'home' ? <HereMark href="/">Vizzy</HereMark> : <Link href="/">Vizzy</Link>}
      <AccountLink current={here === 'account'} email={email} />
    </nav>
  );
}
