import { describe, expect, it } from 'vitest';
import { mintDraft } from './from-prompt';

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
});
