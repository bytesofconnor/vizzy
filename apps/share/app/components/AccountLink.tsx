'use client';

import { HereMark } from './HereMark';
import { NavDustLink } from './NavDustLink';
import { SaveGoogle } from './SaveGoogle';

export function AccountLink({
  current = false,
  email,
  known = false,
}: {
  current?: boolean;
  email?: string;
  known?: boolean;
}) {
  const google = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  if (email) {
    if (current) {
      return (
        <HereMark href="/me" mail email={email}>
          {email}
        </HereMark>
      );
    }
    return (
      <NavDustLink
        href="/me"
        className="kicker-mail"
        title={email}
        ariaLabel={`Account, ${email}`}
      >
        <MailNavLabel email={email} />
      </NavDustLink>
    );
  }

  if (known) {
    if (current) {
      return <HereMark href="/me">Account</HereMark>;
    }
    return (
      <NavDustLink href="/me" className="kicker-nav-soft">
        Account
      </NavDustLink>
    );
  }

  if (google) {
    return <SaveGoogle compact />;
  }

  if (current) {
    return (
      <HereMark href="/me" className="kicker-nav-soft">
        Account
      </HereMark>
    );
  }

  return (
    <NavDustLink href="/me" className="kicker-nav-soft">
      Account
    </NavDustLink>
  );
}

function MailNavLabel({ email }: { email: string }) {
  return (
    <>
      <span className="kicker-mail-short">Account</span>
      <span className="kicker-mail-full">{email}</span>
    </>
  );
}
