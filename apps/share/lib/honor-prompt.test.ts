import { describe, expect, it } from 'vitest';
import { honestTitle } from './honor-prompt';

describe('honestTitle', () => {
  it('names new capacity when the ask said installed and the series is new', () => {
    const title = honestTitle({
      asked: 'Top 10 countries by installed solar capacity in 2023',
      title: 'Top 10 countries by installed solar capacity in 2023',
      xLabel: 'Country',
      yLabel: 'New capacity (MW)',
      rows: [
        { x: 'China', y: 217 },
        { x: 'United States', y: 32 },
        { x: 'Germany', y: 14 },
      ],
      note: 'Additions in 2023',
    });
    expect(title.toLowerCase()).toContain('new capacity');
    expect(title.toLowerCase()).not.toContain('installed');
  });

  it('names new capacity when the lookup table is additions and the axis label is vague', () => {
    const title = honestTitle({
      asked: 'Top 10 countries by installed solar capacity in 2023',
      title: 'Top 10 countries by installed solar capacity in 2023',
      xLabel: 'Country',
      yLabel: 'MW',
      rows: [
        { x: 'China', y: 217 },
        { x: 'United States', y: 32 },
      ],
      notes: '| Country | Added capacity (MW) |\n| --- | --- |\n| China | 217 |',
    });
    expect(title.toLowerCase()).toContain('new capacity');
    expect(title.toLowerCase()).not.toContain('installed');
  });

  it('keeps an installed-capacity title when that is the series', () => {
    const asked = 'Top 10 countries by installed solar capacity in 2023';
    const title = honestTitle({
      asked,
      title: asked,
      xLabel: 'Country',
      yLabel: 'Installed capacity (GW)',
      rows: [
        { x: 'China', y: 610 },
        { x: 'United States', y: 139 },
      ],
    });
    expect(title).toBe(asked);
  });

  it('says a single year when each-year launches are one year of countries', () => {
    const title = honestTitle({
      asked: 'Who launches most satellites each year',
      title: 'Who launches most satellites each year',
      xLabel: 'Country',
      yLabel: 'Satellites launched',
      rows: [
        { x: 'United States', y: 181 },
        { x: 'China', y: 92 },
        { x: 'Russia', y: 17 },
      ],
      note: 'ITU filings, 2025',
      sourceLabel: 'https://www.itu.int/en/space',
    });
    expect(title.toLowerCase()).toContain('single year');
    expect(title).toContain('2025');
    expect(title.toLowerCase()).not.toContain('each year');
  });

  it('leaves a real year series titled as the ask', () => {
    const asked = 'Who launches most satellites each year';
    const title = honestTitle({
      asked,
      title: asked,
      xLabel: 'Year',
      yLabel: 'Satellites launched',
      rows: [
        { x: '2021', y: 146 },
        { x: '2022', y: 186 },
        { x: '2023', y: 223 },
        { x: '2024', y: 263 },
      ],
    });
    expect(title).toBe(asked);
  });
});
