'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { HereMark } from './HereMark';

type Quota = {
  configured?: boolean;
  credits?: number;
  unlimited?: boolean;
  saved?: boolean;
  justPaid?: boolean;
  email?: string;
};

export function AccountLink({
  current = false,
  email,
}: {
  current?: boolean;
  email?: string;
}) {
  const [show, setShow] = useState(current || Boolean(email));
  const [label, setLabel] = useState(email || 'Account');

  useEffect(() => {
    if (email) {
      return;
    }
    let cancel = false;
    void fetch('/api/quota')
      .then((response) => response.json())
      .then((body: unknown) => {
        if (cancel || typeof body !== 'object' || body === null) {
          return;
        }
        const quota = body as Quota;
        const named = quota.saved && quota.email ? quota.email : 'Account';
        setLabel(named);
        setShow(
          current ||
            Boolean(
              quota.configured && (quota.saved || quota.justPaid || (quota.credits ?? 0) > 0 || quota.unlimited)
            )
        );
      })
      .catch(() => undefined);
    return () => {
      cancel = true;
    };
  }, [current, email]);

  if (!show) {
    return null;
  }

  const mail = label.includes('@');
  if (current) {
    return (
      <HereMark href="/me" mail={mail}>
        {label}
      </HereMark>
    );
  }

  return (
    <Link href="/me" className={mail ? 'kicker-mail' : undefined} title={mail ? label : undefined}>
      {label}
    </Link>
  );
}
