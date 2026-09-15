'use client';

import { useEffect } from 'react';

export function PwaBoot() {
  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    document.documentElement.classList.toggle('is-pwa', standalone);

    let ink: number | undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      document.documentElement.classList.add('is-inked');
    } else {
      ink = window.setTimeout(() => {
        document.documentElement.classList.add('is-inked');
      }, 420);
    }

    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
    }

    return () => {
      if (ink !== undefined) {
        window.clearTimeout(ink);
      }
    };
  }, []);
  return null;
}
