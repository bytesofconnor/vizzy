import { matchPrompt } from '@vizzy/resolve';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./lookup', async () => {
  const actual = await vi.importActual<typeof import('./lookup')>('./lookup');
  return {
    ...actual,
    gatherFacts: vi.fn(async () => ({ notes: 'Public lookup found no matching table.', urls: [] })),
  };
});

import { decideCompose, type MintOrder } from './compose-decision';
import { pieceFromPrompt } from './from-prompt';
import { heuristicInsight, heuristicLesson } from './insight-heuristic';
import type { ChartSeed } from './seed';

const inventedHousing: ChartSeed = {
  title: 'Housing Market Index by City',
  kicker: 'Illustrative',
  note: 'A sketch of city housing markets.',
  chartType: 'bar',
  area: false,
  xLabel: 'City',
  yLabel: 'Index',
  sourceLabel: 'No published source',
  sourceMethod: 'example',
  evidence: 'Public lookup found no matching page.',
  rows: [
    { x: 'Nashville', y: 142 },
    { x: 'Austin', y: 96 },
    { x: 'Detroit', y: 61 },
  ],
};

function seriesBacked(prompt: string): boolean {
  const series = matchPrompt(prompt);
  return Boolean(series?.sourceUrl.startsWith('https://') && series.sourceLabel.trim());
}

describe('housing prompt', () => {
  it('asks for a real series or plots one, and never a placeholder city index', () => {
    const asked = decideCompose({ prompt: 'housing', disposition: undefined });
    expect(asked.kind === 'clarify' || asked.kind === 'mint').toBe(true);
    if (asked.kind === 'clarify') {
      expect(asked.ask.options.length).toBeGreaterThanOrEqual(1);
      expect(asked.ask.options.length).toBeLessThanOrEqual(3);
      expect(JSON.stringify(asked.ask)).not.toMatch(/Housing Market Index|Nashville/i);
      expect(asked.ask.options.map((option) => matchPrompt(option.prompt)?.seriesId)).toEqual([
        'HOUST',
        'MSPUS',
        'CSUSHPINSA',
      ]);
      for (const option of asked.ask.options) {
        expect(seriesBacked(option.prompt)).toBe(true);
        expect(decideCompose({ prompt: option.prompt, disposition: undefined }).kind).toBe('mint');
      }
    }
    if (asked.kind === 'mint') {
      expect(seriesBacked(asked.prompt)).toBe(true);
      expect(asked.prompt).not.toMatch(/Housing Market Index|by city/i);
    }

    const sent = decideCompose({ prompt: 'housing', disposition: 'send' });
    expect(sent.kind === 'clarify' || sent.kind === 'mint').toBe(true);
    if (sent.kind === 'clarify') {
      expect(sent.ask.options.length).toBeGreaterThanOrEqual(1);
      expect(sent.ask.options.length).toBeLessThanOrEqual(3);
      for (const option of sent.ask.options) {
        expect(seriesBacked(option.prompt)).toBe(true);
      }
    }
    if (sent.kind === 'mint') {
      expect(seriesBacked(sent.prompt)).toBe(true);
      expect(sent.prompt).not.toMatch(/Housing Market Index|by city/i);
    }
  });

  it('does not mint an invented housing city index when lookup has no series', async () => {
    const minted = await pieceFromPrompt({ kind: 'mint', prompt: 'housing' } as MintOrder);
    expect(minted.ok).toBe(false);
    if (!minted.ok) {
      expect(minted.error).toMatch(/published numbers/i);
    }
    if (minted.ok) {
      const labels = minted.piece.data.map((row) => String(row.x)).join(' ');
      expect(labels).not.toMatch(/Nashville/);
      expect(minted.piece.title).not.toMatch(/Housing Market Index/i);
    }
  });

  it('does not state invented housing values as fact', () => {
    const insight = heuristicInsight(inventedHousing);
    const lesson = heuristicLesson(inventedHousing, 1);
    const text = `${insight}\n${lesson.notice}\n${lesson.teach}\n${lesson.question}\n${lesson.tryNext}`;
    expect(text).not.toMatch(/Nashville/);
    expect(text).not.toMatch(/sits at the high end/);
    expect(text).not.toMatch(/\b142\b/);
  });
});
