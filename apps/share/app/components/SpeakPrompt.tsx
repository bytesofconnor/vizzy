'use client';

import { useEffect, useRef, useState } from 'react';

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognition(): Rec | null {
  const Ctor =
    typeof window === 'undefined'
      ? undefined
      : (window as Window & { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec })
          .SpeechRecognition ??
        (window as Window & { webkitSpeechRecognition?: new () => Rec }).webkitSpeechRecognition;
  if (!Ctor) {
    return null;
  }
  return new Ctor();
}

export function SpeakPrompt({
  onText,
  disabled = false,
}: {
  onText: (text: string) => void;
  disabled?: boolean;
}) {
  const [ready, setReady] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Rec | null>(null);

  useEffect(() => {
    setReady(Boolean(recognition()));
  }, []);

  useEffect(() => {
    return () => {
      rec.current?.stop();
    };
  }, []);

  if (!ready) {
    return null;
  }

  function toggle() {
    if (disabled) {
      return;
    }
    if (listening) {
      rec.current?.stop();
      setListening(false);
      return;
    }
    const next = recognition();
    if (!next) {
      return;
    }
    next.lang = typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';
    next.interimResults = true;
    next.continuous = false;
    next.onresult = (event) => {
      let said = '';
      for (let i = 0; i < event.results.length; i += 1) {
        said += event.results[i]?.[0]?.transcript ?? '';
      }
      const text = said.trim();
      if (text) {
        onText(text);
      }
    };
    next.onend = () => {
      setListening(false);
    };
    next.onerror = () => {
      setListening(false);
    };
    rec.current = next;
    try {
      next.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }

  return (
    <button
      type="button"
      aria-pressed={listening}
      aria-label={listening ? 'Stop listening' : 'Speak the prompt'}
      onClick={toggle}
      disabled={disabled}
    >
      {listening ? 'Listening' : 'Speak'}
    </button>
  );
}
