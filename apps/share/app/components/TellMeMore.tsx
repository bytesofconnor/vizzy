'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ChartSeed } from '../../lib/seed';

const MAX_LESSON_LAYERS = 5;

type ChartLesson = {
  notice: string;
  teach: string;
  question: string;
  tryNext: string;
};

const LAYER_KICKER = [
  'A closer look',
  'What it conceals',
  'Another reading',
  'What would have to change',
  'The harder question',
] as const;

export const FILL_COMPOSE_PROMPT = 'vizzy:fill-prompt';

export function fillComposePrompt(prompt: string, fresh = false) {
  window.dispatchEvent(new CustomEvent(FILL_COMPOSE_PROMPT, { detail: { prompt, fresh } }));
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

async function requestLesson(
  seed: ChartSeed,
  insight: string | null,
  layer: number,
  prior: ChartLesson[]
): Promise<ChartLesson | null> {
  const payload = {
    seed,
    insight,
    depth: 'lesson' as const,
    layer,
    prior: prior.map((item) => ({ notice: item.notice, question: item.question })),
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body: unknown = await response.json();
      if (isLessonBody(body)) {
        return body.lesson;
      }
    } catch {
      // try once more
    }
    if (attempt === 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
    }
  }
  return null;
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
  const [layers, setLayers] = useState<ChartLesson[]>([]);
  const [busy, setBusy] = useState(!presetInsight);
  const [lessonBusy, setLessonBusy] = useState(false);
  const [fail, setFail] = useState(false);
  const [lessonFail, setLessonFail] = useState(false);
  const [open, setOpen] = useState(true);
  const onInsightRef = useRef(onInsight);
  const seedRef = useRef(seed);
  onInsightRef.current = onInsight;
  seedRef.current = seed;
  const chartKey = seedKey(seed);
  const canGoDeeper = layers.length < MAX_LESSON_LAYERS;

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
    setLayers([]);
    setLessonFail(false);
    setOpen(true);
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
    if (!canGoDeeper || lessonBusy) {
      return;
    }
    setLessonBusy(true);
    setLessonFail(false);
    const asked = layers.length + 1;
    try {
      const lesson = await requestLesson(seedRef.current, insight, asked, layers);
      if (lesson) {
        setLayers((current) => [...current, lesson]);
        setLessonFail(false);
      } else {
        setLessonFail(true);
      }
    } catch {
      setLessonFail(true);
    }
    setLessonBusy(false);
  }

  const bodyId = useId();

  return (
    <div className={embedded ? 'tell-more is-embedded' : 'tell-more'}>
      {busy && !insight ? (
        <div className="tell-more-body">
          <p className="tell-more-kicker">Context</p>
          <p className="tell-more-text is-pending">Reading the chart…</p>
        </div>
      ) : insight ? (
        <div className={open ? 'tell-more-body' : 'tell-more-body is-folded'}>
          <div className="tell-more-bar">
            <p className="tell-more-kicker">Context</p>
            <button
              type="button"
              className="tell-more-fold"
              aria-expanded={open}
              aria-controls={bodyId}
              aria-label={open ? 'Hide context' : 'Show context'}
              onClick={() => setOpen((current) => !current)}
            >
              {open ? 'Hide' : 'Show'}
            </button>
          </div>
          {open ? (
            <div id={bodyId}>
              {insight.split(/\n\s*\n/).map((paragraph) => (
                <p key={paragraph.slice(0, 24)} className="tell-more-text">
                  {paragraph}
                </p>
              ))}
              {layers.map((lesson, index) => (
                <div key={`${index}-${lesson.question.slice(0, 20)}`} className="tell-more-lesson">
                  <p className="tell-more-kicker">{LAYER_KICKER[index] ?? 'Deeper'}</p>
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
                    onClick={() => fillComposePrompt(lesson.tryNext, true)}
                  >
                    Keep learning
                    <span>{lesson.tryNext}</span>
                  </button>
                </div>
              ))}
              {canGoDeeper ? (
                <>
                  <button
                    type="button"
                    className="tell-more-trigger tell-more-deeper"
                    onClick={() => void loadLesson()}
                    disabled={lessonBusy}
                  >
                    {lessonBusy ? 'Going deeper…' : 'Tell me even more'}
                  </button>
                  {lessonFail && !lessonBusy ? (
                    <p className="tell-more-fail" role="status">
                      Still working on a deeper cut. Try the button once more.
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
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
