'use client';

import { AccountLink } from './AccountLink';
import { HereMark } from './HereMark';
import { NavDustLink } from './NavDustLink';
import { VizzyHomeLink } from './VizzyHomeLink';

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
      <VizzyHomeLink current={here === 'home'} />
      <span style={{ display: 'inline-flex', alignItems: 'center' }} className="kicker-nav-tools">
        {owner ? (
          here === 'admin' ? (
            <HereMark href="/admin" className="kicker-nav-soft">
              admin
            </HereMark>
          ) : (
            <NavDustLink href="/admin" className="kicker-nav-soft">
              admin
            </NavDustLink>
          )
        ) : null}
        <AccountLink current={here === 'account'} email={email} known={known} />
      </span>
    </nav>
  );
}
