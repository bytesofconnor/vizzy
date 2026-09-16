'use client';

import { useEffect, useState } from 'react';
import type { ChartSeed } from '../../lib/seed';

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
  const [busy, setBusy] = useState(false);
  const [fail, setFail] = useState(false);
  const [open, setOpen] = useState(Boolean(presetInsight));

  useEffect(() => {
    if (presetInsight) {
      onInsight(presetInsight);
    }
  }, [presetInsight, onInsight]);

  async function load() {
    if (insight || busy) {
      setOpen(true);
      return;
    }
    setBusy(true);
    setFail(false);
    try {
      const response = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed }),
      });
      const body: unknown = await response.json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'ok' in body &&
        body.ok === true &&
        'insight' in body &&
        typeof body.insight === 'string'
      ) {
        setInsight(body.insight);
        onInsight(body.insight);
        setOpen(true);
      } else {
        setFail(true);
        onInsight(null);
      }
    } catch {
      setFail(true);
      onInsight(null);
    }
    setBusy(false);
  }

  return (
    <div className={embedded ? 'tell-more is-embedded' : 'tell-more'}>
      {!open ? (
        <button type="button" className="tell-more-trigger" onClick={() => void load()} disabled={busy}>
          {busy ? 'Reading the chart…' : fail ? 'Try again' : 'Tell me more'}
        </button>
      ) : insight ? (
        <div className="tell-more-body">
          <p className="tell-more-kicker">Context</p>
          {insight.split(/\n\s*\n/).map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="tell-more-text">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
      {fail && !insight ? (
        <p className="tell-more-fail" role="alert">
          Could not load context right now.
        </p>
      ) : null}
    </div>
  );
}
