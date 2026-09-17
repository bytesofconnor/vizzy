import { describe, expect, it } from 'vitest';
import { coerceLesson, heuristicInsight, heuristicLesson, isRankingQuiz, sanitizeLesson } from './chart-insight';
import type { ChartSeed } from './seed';

const reef: ChartSeed = {
  title: 'Coral cover',
  kicker: 'Reef',
  note: 'AIMS survey',
  chartType: 'line',
  area: false,
  xLabel: 'Year',
  yLabel: 'Cover %',
  sourceLabel: 'AIMS',
  sourceMethod: 'official',
  evidence: 'Long-term monitoring',
  rows: [
    { x: 'North', y: 28 },
    { x: 'Central', y: 22 },
    { x: 'South', y: 12 },
  ],
};

describe('sanitizeLesson', () => {
  it('keeps a complete closer look', () => {
    const lesson = sanitizeLesson({
      notice: 'Permits sit well above starts in the latest month, which is a queue, not a boom.',
      teach:
        'Builders pull permits before they break ground, so a gap often means capital is committed while labor or financing is still catching up.\n\nIf the gap closed because permits fell, that is a different story than starts catching up — one is a stall, the other is delivery.',
      question: 'If credit tightened, would permits or starts move first?',
      tryNext: 'Chart housing starts per 1,000 people instead of the raw count.',
    });
    expect(lesson?.notice).toMatch(/Permits/);
    expect(lesson?.tryNext).toMatch(/starts/);
  });

  it('flags a ranking quiz', () => {
    expect(isRankingQuiz('Which country has the second-highest average annual forest loss?')).toBe(
      true
    );
    expect(
      isRankingQuiz('If Brazil leads because it is huge, does a total ranking hide the fastest shrinking forests?')
    ).toBe(false);
  });

  it('drops a thin lesson', () => {
    expect(
      sanitizeLesson({
        notice: 'Hi there everyone',
        teach: 'Too short',
        question: 'Why is this happening in general?',
        tryNext: 'More',
      })
    ).toBeNull();
  });

  it('accepts tryFresh as tryNext', () => {
    expect(
      coerceLesson({
        notice: 'South cover falls first, then the other regions follow.',
        teach:
          'Heat often hits one region before the others. A later bend in the north is a lag, not a separate mystery.\n\nTreat the last survey as provisional until the next published point confirms it.',
        question: 'Is the southern drop a warning or a one-off?',
        tryFresh: 'Chart bleaching days next to cover over time.',
      })?.tryNext
    ).toMatch(/bleaching/);
  });
});

describe('heuristic fallbacks', () => {
  it('always returns a full insight', () => {
    expect(heuristicInsight(reef).length).toBeGreaterThan(80);
  });

  it('returns a valid lesson for every layer', () => {
    for (let layer = 1; layer <= 5; layer += 1) {
      expect(sanitizeLesson(heuristicLesson(reef, layer))).not.toBeNull();
    }
  });
});
