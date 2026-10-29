'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  heuristicInsight,
  heuristicLesson,
  MAX_LESSON_LAYERS,
  type ChartLesson,
} from '../../lib/chart-insight-heuristics';
import type { ChartSeed } from '../../lib/seed';

const LAYER_KICKER = [
  'A closer look',
  'What it conceals',
  'Another reading',
  'What would have to change',
  'The harder question',
] as const;

export const FILL_COMPOSE_PROMPT = 'vizzy:fill-prompt';

export type FillComposeResult = 'started' | 'filled' | 'busy' | 'absent';

export type FillComposeDetail = {
  prompt: string;
  fresh: boolean;
  submit: boolean;
  result: FillComposeResult;
};

export function fillComposePrompt(prompt: string, fresh = false, submit = false): FillComposeResult {
  const detail: FillComposeDetail = { prompt, fresh, submit, result: 'absent' };
  window.dispatchEvent(new CustomEvent(FILL_COMPOSE_PROMPT, { detail }));
  return detail.result;
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
  const [insight, setInsight] = useState<string | null>(() =>
    presetInsight ? presetInsight : heuristicInsight(seed)
  );
  const [layers, setLayers] = useState<ChartLesson[]>(() =>
    presetInsight ? [] : [heuristicLesson(seed, 1)]
  );
  const [busy, setBusy] = useState(false);
  const [lessonBusy, setLessonBusy] = useState(false);
  const [fail, setFail] = useState(false);
  const [lessonFail, setLessonFail] = useState(false);
  const [fillNote, setFillNote] = useState('');
  const [open, setOpen] = useState(true);
  const onInsightRef = useRef(onInsight);
  const seedRef = useRef(seed);
  const insightRef = useRef(insight);
  onInsightRef.current = onInsight;
  seedRef.current = seed;
  insightRef.current = insight;
  const chartKey = seedKey(seed);
  const canGoDeeper = layers.length < MAX_LESSON_LAYERS;

  const loadContext = useCallback(async (signal?: AbortSignal) => {
    const requestedKey = seedKey(seedRef.current);
    const nextSeed = seedRef.current;
    if (!insightRef.current) {
      setBusy(true);
    }
    setFail(false);
    try {
      const response = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: nextSeed }),
        signal,
      });
      const body: unknown = await response.json();
      if (signal?.aborted || seedKey(seedRef.current) !== requestedKey) {
        return;
      }
      if (isInsightBody(body)) {
        insightRef.current = body.insight;
        setInsight(body.insight);
        onInsightRef.current(body.insight);
      } else if (!insightRef.current) {
        setFail(true);
        onInsightRef.current(null);
      }
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === 'AbortError')) {
        return;
      }
      if (!insightRef.current) {
        setFail(true);
        onInsightRef.current(null);
      }
    }
    setBusy(false);
  }, []);

  useEffect(() => {
    setLessonFail(false);
    setOpen(true);
    if (presetInsight) {
      setLayers([]);
      insightRef.current = presetInsight;
      setInsight(presetInsight);
      setBusy(false);
      setFail(false);
      onInsightRef.current(presetInsight);
      return;
    }
    const nextSeed = seedRef.current;
    const local = heuristicInsight(nextSeed);
    insightRef.current = local;
    setInsight(local);
    setLayers([heuristicLesson(nextSeed, 1)]);
    setBusy(false);
    setFail(false);
    onInsightRef.current(local);
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

  function keepLearning(tryNext: string) {
    const result = fillComposePrompt(tryNext, true, true);
    if (result === 'busy') {
      setFillNote('Still making a chart. Try again when it finishes.');
      return;
    }
    if (result === 'absent') {
      setFillNote('No composer on this page.');
      return;
    }
    if (fillNote) {
      setFillNote('');
    }
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
                    onClick={() => keepLearning(lesson.tryNext)}
                  >
                    Keep learning
                    <span>{lesson.tryNext}</span>
                  </button>
                </div>
              ))}
              {fillNote ? (
                <p className="tell-more-fail" role="status">
                  {fillNote}
                </p>
              ) : null}
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
