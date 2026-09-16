'use client';

import { useEffect, useState } from 'react';

const TYPE_MS = 34;
const DELETE_MS = 18;
const HOLD_MS = 2400;
const BETWEEN_MS = 420;

export function usePromptTypewriter(prompts: readonly string[], enabled: boolean) {
  const [ideaIndex, setIdeaIndex] = useState(0);
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (!enabled || prompts.length === 0) {
      setDisplay('');
      return;
    }

    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced) {
      let index = 0;
      setDisplay(prompts[0] ?? '');
      const id = window.setInterval(() => {
        index = (index + 1) % prompts.length;
        setIdeaIndex(index);
        setDisplay(prompts[index] ?? '');
      }, HOLD_MS + BETWEEN_MS);
      return () => window.clearInterval(id);
    }

    let index = 0;
    let text = '';
    let phase: 'type' | 'hold' | 'delete' = 'type';
    let timer = 0;
    let cancelled = false;

    const tick = () => {
      if (cancelled) {
        return;
      }
      const full = prompts[index] ?? '';

      if (phase === 'type') {
        if (text.length < full.length) {
          text = full.slice(0, text.length + 1);
          setDisplay(text);
          setIdeaIndex(index);
          timer = window.setTimeout(tick, TYPE_MS);
          return;
        }
        phase = 'hold';
        timer = window.setTimeout(tick, HOLD_MS);
        return;
      }

      if (phase === 'hold') {
        phase = 'delete';
        timer = window.setTimeout(tick, DELETE_MS);
        return;
      }

      if (text.length > 0) {
        text = text.slice(0, -1);
        setDisplay(text);
        timer = window.setTimeout(tick, DELETE_MS);
        return;
      }

      index = (index + 1) % prompts.length;
      phase = 'type';
      timer = window.setTimeout(tick, BETWEEN_MS);
    };

    tick();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, prompts]);

  const fullPrompt = prompts[ideaIndex] ?? '';

  return { display, fullPrompt, ideaIndex };
}
