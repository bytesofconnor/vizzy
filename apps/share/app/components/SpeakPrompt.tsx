'use client';

import { useEffect, useRef, useState } from 'react';

type RecError = { error?: string };
type RecResult = { transcript: string };
type RecEvent = {
  resultIndex: number;
  results: ArrayLike<ArrayLike<RecResult> & { isFinal?: boolean }>;
};

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: RecEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: RecError) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function speechCtor(): (new () => Rec) | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const w = window as Window & {
    SpeechRecognition?: new () => Rec;
    webkitSpeechRecognition?: new () => Rec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

function touchMobile(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768;
}

function iosBrowser(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

async function ensureMic(): Promise<'ok' | 'denied' | 'missing'> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'ok';
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    for (const track of stream.getTracks()) {
      track.stop();
    }
    return 'ok';
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'denied';
    }
    return 'missing';
  }
}

function messageForError(code: string | undefined): string | null {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Allow microphone access for Speak.';
    case 'no-speech':
      return 'Did not catch that. Tap Speak and say it again.';
    case 'audio-capture':
      return 'No microphone found.';
    case 'network':
      return 'Speak needs a network connection.';
    case 'aborted':
      return null;
    default:
      return code ? 'Speak is unavailable right now.' : null;
  }
}

export function SpeakPrompt({
  onText,
  disabled = false,
}: {
  onText: (text: string) => void;
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<'loading' | 'ready' | 'ios' | 'none'>('loading');
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const rec = useRef<Rec | null>(null);
  const mobile = useRef(false);

  useEffect(() => {
    mobile.current = touchMobile();
    if (iosBrowser()) {
      setMode('ios');
      return;
    }
    setMode(speechCtor() ? 'ready' : 'none');
  }, []);

  useEffect(() => {
    return () => {
      rec.current?.abort();
    };
  }, []);

  if (mode === 'loading' || mode === 'none') {
    return null;
  }

  if (mode === 'ios') {
    return (
      <span className="speak-hint" title="Safari and Chrome on iPhone do not expose browser speech-to-text.">
        Use the keyboard mic to dictate.
      </span>
    );
  }

  function stop() {
    rec.current?.stop();
    setListening(false);
  }

  function buildRecognition(): Rec {
    const Ctor = speechCtor();
    if (!Ctor) {
      throw new Error('SpeechRecognition missing');
    }
    const next = new Ctor();
    next.lang = navigator.language || 'en-US';
    next.interimResults = !mobile.current;
    next.continuous = false;
    next.maxAlternatives = 1;
    next.onstart = () => {
      setListening(true);
      setError('');
    };
    next.onresult = (event) => {
      let said = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i];
        if (mobile.current && chunk && !chunk.isFinal) {
          continue;
        }
        said += chunk?.[0]?.transcript ?? '';
      }
      const text = said.trim();
      if (text) {
        onText(text);
      }
    };
    next.onend = () => {
      setListening(false);
    };
    next.onerror = (event) => {
      setListening(false);
      const message = messageForError(event.error);
      if (message) {
        setError(message);
      }
    };
    return next;
  }

  async function toggle() {
    if (disabled) {
      return;
    }
    if (listening) {
      stop();
      return;
    }

    setError('');
    rec.current?.abort();

    if (mobile.current) {
      const mic = await ensureMic();
      if (mic === 'denied') {
        setError('Allow microphone access for Speak.');
        return;
      }
      if (mic === 'missing') {
        setError('No microphone found.');
        return;
      }
    }

    let next: Rec;
    try {
      next = buildRecognition();
    } catch {
      setError('Speak is unavailable in this browser.');
      return;
    }

    rec.current = next;
    try {
      next.start();
    } catch {
      if (mobile.current) {
        const mic = await ensureMic();
        if (mic !== 'ok') {
          setError(mic === 'denied' ? 'Allow microphone access for Speak.' : 'No microphone found.');
          return;
        }
        try {
          next.start();
          return;
        } catch {
          setError('Speak could not start. Try again.');
          return;
        }
      }
      setError('Speak could not start. Try again.');
    }
  }

  return (
    <>
      <button
        type="button"
        aria-pressed={listening}
        aria-label={listening ? 'Stop listening' : 'Speak the prompt'}
        onClick={() => void toggle()}
        disabled={disabled}
      >
        {listening ? 'Listening…' : 'Speak'}
      </button>
      {error ? (
        <span role="alert" className="speak-hint">
          {error}
        </span>
      ) : listening ? (
        <span className="speak-hint" aria-live="polite">
          Say what to chart.
        </span>
      ) : null}
    </>
  );
}
