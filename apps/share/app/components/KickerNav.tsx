'use client';

import Link from 'next/link';
import { AccountLink } from './AccountLink';
import { HereMark } from './HereMark';

export function KickerNav({
  here,
  email,
  known = false,
  owner = false,
}: {
  here: 'home' | 'account' | 'terms' | 'agents' | 'admin';
  email?: string;
  known?: boolean;
  owner?: boolean;
}) {
  return (
    <nav className="kicker-nav" aria-label="Site">
      {here === 'home' ? <HereMark href="/">Vizzy</HereMark> : <Link href="/">Vizzy</Link>}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 16 }}>
        {owner ? (
          here === 'admin' ? <HereMark href="/admin">Admin</HereMark> : <Link href="/admin">Admin</Link>
        ) : null}
        <AccountLink current={here === 'account'} email={email} known={known} />
      </span>
    </nav>
  );
}
