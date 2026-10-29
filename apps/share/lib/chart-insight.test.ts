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

  it('does not call an empty slot the low value', () => {
    const text = heuristicInsight({
      ...reef,
      chartType: 'bar',
      rows: [
        { x: '18-29', y: 27 },
        { x: '30-49', y: 35 },
        { x: '65+', y: null },
      ],
    });
    expect(text).toMatch(/30-49/);
    expect(text).toMatch(/18-29/);
    expect(text).not.toMatch(/65\+/);
  });

  it('cites the plotted percent for that year and the same span as the axis', () => {
    const text = heuristicInsight({
      ...reef,
      title: 'Extreme poverty 1990-2023',
      note: 'about 9.8% in 2023, covering 1990-2026',
      xLabel: 'Year',
      yLabel: 'Share in poverty %',
      chartType: 'line',
      rows: [
        { x: '1990', y: 43.4 },
        { x: '2023', y: 10.5 },
      ],
    });
    expect(text).toMatch(/10\.5%/);
    expect(text).toMatch(/1990-2023/);
    expect(text).not.toMatch(/9\.8/);
    expect(text).not.toMatch(/2026/);
  });

  it('does not leave a funds-rate context on 2000 when the line starts in 2020', () => {
    const text = heuristicInsight({
      ...reef,
      title: 'US federal funds rate since 2020',
      note: 'from 2000 onward',
      xLabel: 'Month',
      yLabel: 'Rate %',
      chartType: 'line',
      rows: [
        { x: '2020-01', y: 1.55 },
        { x: '2021-06', y: 0.08 },
        { x: '2024-01', y: 5.33 },
        { x: '2026-01', y: 4.2 },
      ],
    });
    expect(text).not.toMatch(/\b2000\b/);
    expect(text).toMatch(/2020-2026/);
    expect(text).toMatch(/4\.2%/);
  });

  it('names only states the chart plots', () => {
    const plotted = [
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
      'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Iowa', 'Kansas',
    ];
    const rows = plotted.map((state, index) => ({ x: state, y: Number((1.6 + index * 0.1).toFixed(1)) }));
    const top = [...rows].sort((a, b) => b.y - a.y)[0];
    const text = heuristicInsight({
      ...reef,
      title: 'Unemployment rate by US state',
      note: 'Unemployment rates for 50 states. Indiana sits at the high end.',
      xLabel: 'State',
      yLabel: 'Unemployment rate %',
      chartType: 'bar',
      rows,
    });
    expect(text).not.toMatch(/\bIndiana\b/);
    expect(text).not.toMatch(/\b50 states\b/);
    expect(text).toMatch(/\b15 states\b/);
    expect(text).toMatch(new RegExp(`${top?.x} sits at the high end`));
  });

  it('does not say Pew when the source is Gallup', () => {
    const text = heuristicInsight({
      ...reef,
      title: 'Gun ownership by age',
      note: 'Pew, by age group. 50-64 and 65+ were not published.',
      yLabel: 'Share %',
      sourceLabel: 'Gallup',
      sourceMethod: 'scraped',
      sourceUrl: 'https://news.gallup.com/poll/264932/gun-owners.aspx',
    });
    expect(text).not.toMatch(/\bPew\b/);
    expect(text).toMatch(/Gallup/);
  });

  it('returns a valid lesson for every layer', () => {
    for (let layer = 1; layer <= 5; layer += 1) {
      expect(sanitizeLesson(heuristicLesson(reef, layer))).not.toBeNull();
    }
  });

  it('puts a full stop before the shape sentence when the note has none', () => {
    const text = heuristicInsight({
      ...reef,
      note: 'Our World in Data — Antarctic sea ice (NSIDC), 1979-2023',
    });
    expect(text).toMatch(/\.\s+The shape is the story/);
    expect(text).not.toMatch(/[^.!?]\s+The shape is the story/);
  });

  it('does not add a second full stop when the note already ends', () => {
    const text = heuristicInsight({
      ...reef,
      note: 'Published figures.',
    });
    expect(text).not.toMatch(/\.\.\s+The shape is the story/);
    expect(text).toMatch(/\.\s+The shape is the story/);
  });
});

function lessonSeed(overrides: Partial<ChartSeed>): ChartSeed {
  return {
    ...reef,
    rows: [
      { x: 'North', y: 28 },
      { x: 'Central', y: 22 },
      { x: 'South', y: 12 },
    ],
    ...overrides,
  };
}

describe('Keep learning tips fit the measure', () => {
  it('still offers a per-person cut for a raw total', () => {
    const tip = heuristicLesson(
      lessonSeed({
        title: 'Population by country',
        yLabel: 'People',
        xLabel: 'Country',
        rows: [
          { x: 'India', y: 1400 },
          { x: 'China', y: 1410 },
          { x: 'United States', y: 330 },
        ],
      })
    ).tryNext;
    expect(tip).toBe('Show People as a share or per person, not the raw total.');
  });

  it('does not tell a temperature chart to switch to per person', () => {
    const seed = lessonSeed({
      title: 'Global temperature anomaly',
      yLabel: 'Anomaly °C',
      xLabel: 'Year',
      rows: [
        { x: '1991', y: 0.4 },
        { x: '2000', y: 0.6 },
        { x: '2020', y: 1.1 },
      ],
    });
    for (let layer = 1; layer <= 5; layer += 1) {
      const tip = heuristicLesson(seed, layer).tryNext;
      expect(tip).not.toMatch(/per person/i);
      expect(tip).not.toMatch(/raw total/i);
      expect(tip).not.toMatch(/as a rate or a share/i);
    }
    expect(heuristicLesson(seed).tryNext).toBe('Plot the change in Anomaly °C from the prior year.');
  });

  it('does not tell a monthly series to switch to per person', () => {
    const byName = lessonSeed({
      title: 'Minneapolis normal temperature',
      yLabel: 'Temperature °C',
      xLabel: 'Month',
      rows: [
        { x: 'January', y: -9 },
        { x: 'July', y: 23 },
        { x: 'December', y: -7 },
      ],
    });
    const byStamp = lessonSeed({
      title: 'Housing starts',
      yLabel: 'Starts',
      xLabel: 'Month',
      rows: [
        { x: '2020-01', y: 1.5 },
        { x: '2020-06', y: 1.2 },
        { x: '2021-01', y: 1.6 },
      ],
    });
    for (const seed of [byName, byStamp]) {
      expect(heuristicLesson(seed).tryNext).toBe(`Compare ${seed.yLabel} with the same month a year earlier.`);
      expect(heuristicLesson(seed).tryNext).not.toMatch(/per person/i);
    }
  });

  it('does not tell a rate, a share, an index, or a per-person series to renormalize that way', () => {
    const cases: Array<{ yLabel: string; title: string; tip: string }> = [
      {
        title: 'Unemployment rate by state',
        yLabel: 'Unemployment rate %',
        tip: 'Plot the change in Unemployment rate % from the prior period.',
      },
      {
        title: 'Extreme poverty',
        yLabel: 'Share in poverty %',
        tip: 'Plot how Share in poverty % changed over time.',
      },
      {
        title: 'Living Planet Index',
        yLabel: 'Living Planet Index',
        tip: 'Plot the change in Living Planet Index from the prior period.',
      },
      {
        title: 'US CPI',
        yLabel: 'CPI',
        tip: 'Plot the change in CPI from the prior period.',
      },
      {
        title: 'GDP per person',
        yLabel: 'USD per person',
        tip: 'Plot the change in USD per person from the prior period.',
      },
    ];
    for (const item of cases) {
      const seed = lessonSeed({ title: item.title, yLabel: item.yLabel, xLabel: 'Year' });
      const generic = `Show ${item.yLabel} as a share or per person, not the raw total.`;
      expect(heuristicLesson(seed).tryNext).toBe(item.tip);
      for (let layer = 1; layer <= 5; layer += 1) {
        expect(heuristicLesson(seed, layer).tryNext).not.toBe(generic);
      }
    }
  });
});
