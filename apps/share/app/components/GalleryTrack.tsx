'use client';

import { useEffect } from 'react';
import { track } from '../../lib/funnel-browser';

export function GalleryViewTrack() {
  useEffect(() => {
    track('gallery_view');
  }, []);
  return null;
}

export function GalleryRemixLink({ href }: { href: string }) {
  return (
    <a
      className="gallery-remix"
      href={href}
      onClick={() => {
        track('remix_click');
      }}
    >
      Remix this chart
    </a>
  );
}
