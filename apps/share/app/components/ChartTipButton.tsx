'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useKickerTap } from './KickerDust';

export function ChartTipButton({
  label,
  tip,
  spoken,
  pressed,
  expanded,
  popup,
  onClick,
  children,
}: {
  label: string;
  tip: string;
  spoken?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  popup?: 'dialog';
  onClick: () => void;
  children: ReactNode;
}) {
  const tipId = useId();
  const { tap, onPointerDown } = useKickerTap();
  const on = Boolean(pressed || expanded);

  return (
    <span className="pin-control">
      <button
        type="button"
        className={['pin-button', on ? 'is-on' : '', tap ? 'is-tap' : ''].filter(Boolean).join(' ')}
        aria-label={label}
        aria-describedby={tipId}
        aria-pressed={pressed}
        aria-expanded={expanded}
        aria-haspopup={popup}
        onPointerDown={onPointerDown}
        onClick={onClick}
      >
        {children}
      </button>
      <span id={tipId} role="tooltip" className={spoken ? 'pin-tip is-shown' : 'pin-tip'}>
        {tip}
      </span>
    </span>
  );
}

export function useSpokenTip(ms = 1400) {
  const [spoken, setSpoken] = useState(false);
  const timer = useRef(0);

  useEffect(() => {
    return () => window.clearTimeout(timer.current);
  }, []);

  function flash() {
    window.clearTimeout(timer.current);
    setSpoken(true);
    timer.current = window.setTimeout(() => setSpoken(false), ms);
  }

  return { spoken, flash };
}
