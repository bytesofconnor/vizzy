'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

export function EventLink({
  name,
  href,
  onClick,
  ...props
}: ComponentProps<typeof Link> & { name: string }) {
  return (
    <Link
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) {
          return;
        }
        try {
          void fetch('/api/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
            keepalive: true,
          });
        } catch {
          // taps must not block navigation
        }
      }}
      {...props}
    />
  );
}
