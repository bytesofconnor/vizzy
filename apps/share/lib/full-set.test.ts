import { describe, expect, it } from 'vitest';
import { heuristicInsight } from './chart-insight';
import { mintDraft } from './from-prompt';
import { seedFromPiece } from './seed';

const STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming',
];

describe('full category sets', () => {
  it('keeps every US state when the prompt asks for every state', () => {
    const notes = ['| State | People |', '| --- | --- |', ...STATES.map((state, index) => `| ${state} | ${1000 - index} |`)].join('\n');
    const minted = mintDraft(
      'Population of every US state',
      { notes, urls: ['https://www.census.gov/data.html'] },
      {
        title: 'Population by state',
        kicker: 'States',
        note: 'Census counts.',
        chartType: 'bar',
        area: false,
        xLabel: 'State',
        yLabel: 'People',
        sourceLabel: 'US Census',
        sourceMethod: 'scraped',
        evidence: 'State population table.',
        rows: STATES.map((state, index) => ({ x: state, y: 1000 - index })),
      }
    );
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const names = minted.piece.data.map((row) => String(row.x));
    expect(names.length).toBeGreaterThan(15);
    expect(names).toHaveLength(STATES.length);
    expect(names).toContain('New Jersey');
  });

  it('still caps a ranking that did not ask for every member', () => {
    const countries = Array.from({ length: 20 }, (_, index) => `Narnia ${index + 1}`);
    const minted = mintDraft(
      'GDP by country',
      { notes: '', urls: [] },
      {
        title: 'GDP by country',
        kicker: 'GDP',
        note: 'Illustrative ranking.',
        chartType: 'bar',
        area: false,
        xLabel: 'Country',
        yLabel: 'GDP',
        sourceLabel: 'Estimate',
        sourceMethod: 'estimate',
        evidence: 'Lookup failed.',
        rows: countries.map((country, index) => ({ x: country, y: 100 - index })),
      }
    );
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    expect(minted.piece.data).toHaveLength(15);
  });

  it('plots all 50 states for unemployment rate by US state', () => {
    const ranked = STATES.map((state, index) => ({
      x: state,
      y: state === 'Indiana' ? 5.4 : Number((1.6 + index * 0.02).toFixed(2)),
    })).sort((a, b) => a.y - b.y);
    const notes = ['| State | Rate |', '| --- | --- |', ...ranked.map((row) => `| ${row.x} | ${row.y} |`)].join('\n');
    const minted = mintDraft(
      'unemployment rate by US state',
      { notes, urls: ['https://www.bls.gov/lau/'] },
      {
        title: 'Unemployment rate by US state',
        kicker: 'Jobs',
        note: 'Unemployment rates for 50 states. Indiana sits at the high end.',
        chartType: 'bar',
        area: false,
        xLabel: 'State',
        yLabel: 'Unemployment rate %',
        sourceLabel: 'BLS',
        sourceMethod: 'scraped',
        evidence: 'State unemployment table.',
        rows: ranked,
      }
    );
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const names = minted.piece.data.map((row) => String(row.x));
    expect(names).toHaveLength(STATES.length);
    expect(names).toEqual(expect.arrayContaining(STATES));
    expect(minted.piece.note).toMatch(/\b50 states\b/);
    const insight = heuristicInsight(seedFromPiece(minted.piece));
    expect(insight).toMatch(/Indiana sits at the high end/);
    for (const state of STATES) {
      if (insight.includes(state)) {
        expect(names).toContain(state);
      }
    }
  });
});
