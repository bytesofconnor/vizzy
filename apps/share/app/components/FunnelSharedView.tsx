'use client';

import { useEffect, useRef } from 'react';
import { track } from '../../lib/funnel-browser';

export function FunnelSharedView() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) {
      return;
    }
    sent.current = true;
    track('shared_view');
  }, []);
  return null;
}
