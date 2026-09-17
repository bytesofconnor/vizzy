'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChartSeed } from '../../lib/seed';

type ChartLesson = {
  notice: string;
  teach: string;
  question: string;
  tryNext: string;
};

export const FILL_COMPOSE_PROMPT = 'vizzy:fill-prompt';

export function fillComposePrompt(prompt: string) {
  window.dispatchEvent(new CustomEvent(FILL_COMPOSE_PROMPT, { detail: { prompt } }));
}

function seedKey(seed: ChartSeed): string {
  const first = seed.rows[0];
  return `${seed.title}|${seed.rows.length}|${first?.x ?? ''}|${first?.y ?? ''}`;
}

function isInsightBody(body: unknown): body is { ok: true; insight: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'ok' in body &&
    body.ok === true &&
    'insight' in body &&
    typeof body.insight === 'string'
  );
}

function isLessonBody(body: unknown): body is { ok: true; lesson: ChartLesson } {
  if (typeof body !== 'object' || body === null || !('ok' in body) || body.ok !== true || !('lesson' in body)) {
    return false;
  }
  const lesson = (body as { lesson: unknown }).lesson;
  if (typeof lesson !== 'object' || lesson === null) {
    return false;
  }
  const raw = lesson as ChartLesson;
  return (
    typeof raw.notice === 'string' &&
    typeof raw.teach === 'string' &&
    typeof raw.question === 'string' &&
    typeof raw.tryNext === 'string'
  );
}

export function TellMeMore({
  seed,
  presetInsight,
  onInsight,
  embedded = false,
}: {
  seed: ChartSeed;
  presetInsight?: string;
  onInsight: (insight: string | null) => void;
  embedded?: boolean;
}) {
  const [insight, setInsight] = useState<string | null>(presetInsight ?? null);
  const [lesson, setLesson] = useState<ChartLesson | null>(null);
  const [busy, setBusy] = useState(!presetInsight);
  const [lessonBusy, setLessonBusy] = useState(false);
  const [fail, setFail] = useState(false);
  const [lessonFail, setLessonFail] = useState(false);
  const onInsightRef = useRef(onInsight);
  const seedRef = useRef(seed);
  onInsightRef.current = onInsight;
  seedRef.current = seed;
  const chartKey = seedKey(seed);

  const loadContext = useCallback(async (signal?: AbortSignal) => {
    const nextSeed = seedRef.current;
    setBusy(true);
    setFail(false);
    try {
      const response = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: nextSeed }),
        signal,
      });
      const body: unknown = await response.json();
      if (signal?.aborted) {
        return;
      }
      if (isInsightBody(body)) {
        setInsight(body.insight);
        onInsightRef.current(body.insight);
      } else {
        setFail(true);
        onInsightRef.current(null);
      }
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        return;
      }
      setFail(true);
      onInsightRef.current(null);
    }
    setBusy(false);
  }, []);

  useEffect(() => {
    setLesson(null);
    setLessonFail(false);
    if (presetInsight) {
      setInsight(presetInsight);
      setBusy(false);
      setFail(false);
      onInsightRef.current(presetInsight);
      return;
    }
    setInsight(null);
    const controller = new AbortController();
    const wait = window.setTimeout(() => {
      void loadContext(controller.signal);
    }, 2500);
    return () => {
      window.clearTimeout(wait);
      controller.abort();
    };
  }, [chartKey, loadContext, presetInsight]);

  async function loadLesson() {
    if (lesson || lessonBusy) {
      return;
    }
    setLessonBusy(true);
    setLessonFail(false);
    try {
      const response = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: seedRef.current, insight, depth: 'lesson' }),
      });
      const body: unknown = await response.json();
      if (isLessonBody(body)) {
        setLesson(body.lesson);
      } else {
        setLessonFail(true);
      }
    } catch {
      setLessonFail(true);
    }
    setLessonBusy(false);
  }

  return (
    <div className={embedded ? 'tell-more is-embedded' : 'tell-more'}>
      {busy && !insight ? (
        <div className="tell-more-body">
          <p className="tell-more-kicker">Context</p>
          <p className="tell-more-text is-pending">Reading the chart…</p>
        </div>
      ) : insight ? (
        <div className="tell-more-body">
          <p className="tell-more-kicker">Context</p>
          {insight.split(/\n\s*\n/).map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="tell-more-text">
              {paragraph}
            </p>
          ))}
          {lesson ? (
            <div className="tell-more-lesson">
              <p className="tell-more-kicker">A closer look</p>
              <p className="tell-more-notice">{lesson.notice}</p>
              {lesson.teach.split(/\n\s*\n/).map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="tell-more-text">
                  {paragraph}
                </p>
              ))}
              <p className="tell-more-ask">
                <span>Ask yourself</span>
                {lesson.question}
              </p>
              <button
                type="button"
                className="tell-more-next"
                onClick={() => fillComposePrompt(lesson.tryNext)}
              >
                Try this next
                <span>{lesson.tryNext}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="tell-more-trigger tell-more-deeper"
              onClick={() => void loadLesson()}
              disabled={lessonBusy}
            >
              {lessonBusy ? 'Going deeper…' : lessonFail ? 'Try even more again' : 'Tell me even more'}
            </button>
          )}
        </div>
      ) : fail ? (
        <>
          <button type="button" className="tell-more-trigger" onClick={() => void loadContext()} disabled={busy}>
            Tell me more
          </button>
          <p className="tell-more-fail" role="alert">
            Could not load context right now.
          </p>
        </>
      ) : null}
    </div>
  );
}
