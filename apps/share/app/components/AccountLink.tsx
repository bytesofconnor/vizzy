'use client';

import Link from 'next/link';
import { HereMark } from './HereMark';
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
      <Link href="/me" className="kicker-mail" title={email} aria-label={`Account, ${email}`}>
        <MailNavLabel email={email} />
      </Link>
    );
  }

  if (known) {
    if (current) {
      return <HereMark href="/me">Account</HereMark>;
    }
    return <Link href="/me">Account</Link>;
  }

  if (google) {
    return <SaveGoogle compact />;
  }

  if (current) {
    return <HereMark href="/me">Account</HereMark>;
  }

  return <Link href="/me">Account</Link>;
}

function MailNavLabel({ email }: { email: string }) {
  return (
    <>
      <span className="kicker-mail-short">Account</span>
      <span className="kicker-mail-full">{email}</span>
    </>
  );
}
