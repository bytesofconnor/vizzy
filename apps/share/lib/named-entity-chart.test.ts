import { describe, expect, it } from 'vitest';
import { mintFromOfficial } from './official-mint';
import { mintDraft } from './from-prompt';
import { heuristicInsight, heuristicLesson } from './insight-heuristic';
import type { ChartSeed } from './seed';
import type { ResolvedSeries } from '@vizzy/resolve';

const base: ChartSeed = {
  title: 'Chart',
  kicker: 'Chart',
  note: '',
  chartType: 'bar',
  area: false,
  xLabel: 'Country',
  yLabel: 'Value',
  sourceLabel: 'World Bank',
  sourceMethod: 'official',
  evidence: 'Published country table',
  sourceUrl: 'https://data.worldbank.org/indicator/EG.ELC.RNEW.ZS',
  rows: [],
};

function draft(title: string, rows: Array<{ x: string; y: number }>, extra?: { sourceMethod?: 'scraped' | 'estimate'; evidence?: string; yLabel?: string; xLabel?: string }) {
  return {
    title,
    kicker: 'Chart',
    note: 'Looked-up figures.',
    chartType: 'bar' as const,
    area: false,
    xLabel: extra?.xLabel ?? 'City',
    yLabel: extra?.yLabel ?? 'Rent $',
    sourceLabel: 'Public table',
    sourceMethod: extra?.sourceMethod ?? 'scraped',
    evidence: extra?.evidence ?? 'Rows copied from the looked-up table',
    rows,
  };
}

const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
];

describe('named entities from the 2026-10-29 live pass', () => {
  it('titles a Germany and France renewable chart with both countries and official rows', () => {
    const series: ResolvedSeries = {
      family: 'worldbank',
      seriesId: 'EG.ELC.RNEW.ZS',
      sourceLabel: 'World Bank — renewable electricity output',
      sourceUrl: 'https://data.worldbank.org/indicator/EG.ELC.RNEW.ZS',
      method: 'official',
      retrieved: Date.UTC(2026, 9, 29),
      xLabel: 'Country',
      yLabel: 'Renewable share of electricity %',
      rows: [
        { x: 'Germany', y: 39.8 },
        { x: 'France', y: 22.8 },
      ],
    };
    const minted = mintFromOfficial('share of renewable electricity in Germany vs France', series);
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const labels = minted.piece.data.map((row) => String(row.x));
    expect(labels).toEqual(expect.arrayContaining(['Germany', 'France']));
    expect(labels).toHaveLength(2);
    expect(minted.piece.data.every((row) => typeof row.y === 'number' && row.y > 0)).toBe(true);
    expect(minted.piece.title).toMatch(/Germany/);
    expect(minted.piece.title).toMatch(/France/);
    expect(minted.piece.config.source?.method).toBe('official');
    expect(minted.piece.config.source?.method).not.toBe('estimate');
  });

  it('does not add Chicago or an estimate row for Minneapolis rent', () => {
    const notes = ['| City | Rent |', '| --- | --- |', '| Minneapolis | 1988 |'].join('\n');
    const minted = mintDraft(
      'average rent in Minneapolis',
      { notes, urls: ['https://example.com/minneapolis-rent'] },
      draft(
        'Average rent in Minneapolis',
        [
          { x: 'Minneapolis', y: 1900 },
          { x: 'Chicago', y: 2100 },
        ],
        { sourceMethod: 'estimate', evidence: 'Chicago estimated to fulfill chart requirements' }
      )
    );
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const labels = minted.piece.data.map((row) => String(row.x));
    expect(labels).toEqual(['Minneapolis']);
    expect(minted.piece.data[0]?.y).toBe(1988);
    expect(JSON.stringify(minted.piece.data)).not.toMatch(/Chicago/);
    expect(minted.piece.note.toLowerCase()).not.toMatch(/fulfill chart requirements/);
  });

  it('keeps the context on the plotted rent and does not compare a place with itself', () => {
    const rent = heuristicInsight({
      ...base,
      title: 'Average rent in Minneapolis',
      note: 'Average rent is about $1900.',
      xLabel: 'City',
      yLabel: 'Rent $',
      sourceLabel: 'HUD fair market rent',
      sourceMethod: 'scraped',
      sourceUrl: 'https://www.huduser.gov/portal/datasets/fmr.html',
      rows: [{ x: 'Minneapolis', y: 1988 }],
    });
    expect(rent).toMatch(/1988/);
    expect(rent).not.toMatch(/1900/);

    const germany: ChartSeed = {
      ...base,
      title: 'Renewable electricity in Germany',
      note: 'Germany leads on renewable share, well ahead of Germany.',
      yLabel: 'Renewable share of electricity %',
      rows: [
        { x: 'Germany', y: 39.8 },
        { x: 'France', y: null },
      ],
    };
    const insight = heuristicInsight(germany);
    const lesson = heuristicLesson(germany);
    const context = `${insight} ${lesson.notice} ${lesson.teach}`;
    expect(context.toLowerCase()).not.toMatch(/well ahead of germany/);
  });

  it('says top 15 when housing is cut to fifteen states', () => {
    const notes = [
      '| State | Starts |',
      '| --- | --- |',
      ...STATES.map((state, index) => `| ${state} | ${1000 - index} |`),
    ].join('\n');
    const minted = mintDraft(
      'housing',
      { notes, urls: ['https://example.com/housing-by-state'] },
      draft(
        'Housing by state',
        STATES.map((state, index) => ({ x: state, y: 1000 - index })),
        {
          xLabel: 'State',
          yLabel: 'Housing starts',
          evidence: 'State housing starts from the looked-up table',
        }
      )
    );
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.data).toHaveLength(15);
    expect(minted.piece.title.toLowerCase()).toMatch(/top 15/);
    const labels = minted.piece.data.map((row) => String(row.x));
    expect(labels.every((label) => STATES.includes(label))).toBe(true);
  });
});
