'use client';

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { DUST, STUDIO } from '../../lib/theme';

const DOT_PX = 3;
const GAP_PX = 2;
const MIN_DOTS = 8;

function dotCountForWidth(width: number): number {
  if (width <= 0) {
    return MIN_DOTS;
  }
  return Math.max(MIN_DOTS, Math.floor((width + GAP_PX) / (DOT_PX + GAP_PX)));
}

export function KickerDust() {
  const railRef = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(MIN_DOTS);

  useLayoutEffect(() => {
    const rail = railRef.current;
    const label = rail?.parentElement;
    if (!label) {
      return;
    }

    const measure = () => {
      setCount(dotCountForWidth(label.clientWidth));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(label);
    return () => observer.disconnect();
  }, []);

  return (
    <span ref={railRef} className="kicker-dust" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <i
          key={index}
          style={{
            background: index % DUST.length === 6 ? STUDIO.ink : DUST[index % DUST.length],
            ['--dust-i']: String(index % DUST.length),
          }}
        />
      ))}
    </span>
  );
}

export function useKickerTap() {
  const [tap, setTap] = useState(false);

  const onTap = useCallback(() => {
    setTap(true);
    window.setTimeout(() => setTap(false), 800);
  }, []);

  return { tap, onTap };
}
