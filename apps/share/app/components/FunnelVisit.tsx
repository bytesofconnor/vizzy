'use client';

import { useEffect } from 'react';
import { trackVisit } from '../../lib/funnel-browser';

export function FunnelVisit() {
  useEffect(() => {
    trackVisit();
  }, []);
  return null;
}
