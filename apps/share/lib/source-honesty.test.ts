/**
 * @vitest-environment jsdom
 */
import { renderToSVG } from '@vizzy/core';
import { resolvePrompt } from '@vizzy/resolve';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SourceLine } from '../app/components/SourceLine';
import { mintDraft } from './from-prompt';
import { heuristicInsight } from './insight-heuristic';
import { mintFromOfficial } from './official-mint';
import { seedFromPiece } from './seed';
import { sourceCardLine, sourceGrade, sourceLine } from './source';

const TIGER_HTML = `
<table class="wikitable">
  <caption>Global wild tiger population</caption>
  <tr><th>Country</th><th>Year</th><th>Estimate</th></tr>
  <tr><td>India</td><td>2022</td><td>3,167–3,682</td></tr>
  <tr><td>Russia</td><td>2022</td><td>573–600</td></tr>
  <tr><td>Nepal</td><td>2022</td><td>316–355</td></tr>
  <tr><td>Thailand</td><td>2022</td><td>148–189</td></tr>
</table>`;

function tigerGet(): () => Promise<string> {
  return async () => JSON.stringify({ parse: { text: { '*': TIGER_HTML } } });
}

describe('source labels stay honest', () => {
  it('drops citation brackets from a drafted source name', () => {
    const minted = mintDraft(
      'bitcoin price last 5 years',
      { notes: 'Public lookup found no matching table.', urls: [] },
      {
        title: 'Bitcoin price',
        kicker: 'Markets',
        note: 'Closes.',
        chartType: 'line',
        area: false,
        xLabel: 'Month',
        yLabel: 'Price (USD)',
        sourceLabel: 'Yahoo Finance [6], Coingecko [3]',
        sourceMethod: 'scraped',
        evidence: 'Named pages in the lookup.',
        rows: [
          { x: 'Jun 2021', y: 35000 },
          { x: 'Jul 2021', y: 42000 },
          { x: 'Oct 2021', y: 61000 },
          { x: 'Oct 2026', y: 70000 },
        ],
      }
    );
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const line = sourceCardLine(minted.piece.config.source!);
    expect(line).not.toMatch(/\[\d+\]/);
    expect(line).toContain('Yahoo Finance, Coingecko');
  });

  it('does not label Wikipedia tigers official, and the title names the census year', async () => {
    const series = await resolvePrompt('Wild tigers by country', {
      get: tigerGet(),
      now: Date.UTC(2026, 9, 24),
    });
    expect(series?.seriesId).toBe('wild_tigers');
    expect(series?.rows.map((row) => row.x)).toEqual(['India', 'Russia', 'Nepal', 'Thailand']);
    const minted = mintFromOfficial('Wild tigers by country', series!);
    expect(minted.ok).toBe(true);
    if (!minted.ok || !series) {
      return;
    }
    const source = minted.piece.config.source!;
    expect.soft(source.method).not.toBe('official');
    expect.soft(sourceGrade(source)).not.toBe('official');
    expect.soft(sourceLine(source).toLowerCase()).not.toContain('official');
    expect.soft(sourceCardLine(source).toLowerCase()).not.toContain('official');
    expect.soft(minted.piece.title).toMatch(/\b2022\b/);
  });

  it('does not print invented counts when no published page backs them', async () => {
    const minted = mintDraft(
      'Do vaccines cause autism? How many studies found a link?',
      { notes: 'Public lookup found no matching table.', urls: [] },
      {
        title: 'Studies on vaccines and autism',
        kicker: 'Estimate',
        note: 'No published page backs these numbers.',
        chartType: 'bar',
        area: false,
        xLabel: 'Finding',
        yLabel: 'Studies',
        sourceLabel: 'Estimate',
        sourceMethod: 'estimate',
        evidence: 'lookup failed',
        rows: [
          { x: 'Found a link', y: 17 },
          { x: 'Found no link', y: 83 },
        ],
      }
    );
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const source = minted.piece.config.source!;
    expect(source.method).toBe('estimate');
    expect(source.url).toBeUndefined();
    expect(sourceCardLine(source).toLowerCase()).toContain('no published page');
    const svg = await renderToSVG(minted.piece.config, minted.piece.data);
    const printed = [...svg.matchAll(/>([^<]*)</g)].map((match) => match[1]?.replace(/&nbsp;/g, ' ').trim() ?? '').filter(Boolean);
    const numbers = printed.filter((text) => /^-?\d/.test(text));
    expect.soft(printed.join(' ').toLowerCase()).toContain('no published page');
    expect.soft(numbers).toEqual([]);
  });

  it('names Antarctic sea ice with a link, and ends the context sentence', () => {
    const minted = mintFromOfficial('Antarctic sea ice extent 1979-2023 NSIDC', {
      family: 'owid',
      seriesId: 'antarctic_sea_ice',
      sourceLabel: 'Our World in Data — Antarctic sea ice (NSIDC)',
      sourceUrl: 'https://ourworldindata.org/grapher/antarctica-sea-ice-extent',
      method: 'official',
      retrieved: Date.UTC(2026, 0, 15),
      xLabel: 'Year',
      yLabel: 'February minimum (million km²)',
      rows: [
        { x: '1979', y: 3.141 },
        { x: '2001', y: 2.8 },
        { x: '2023', y: 1.978 },
      ],
    });
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const source = minted.piece.config.source!;
    const html = renderToStaticMarkup(createElement(SourceLine, { source }));
    const visible = sourceLine(source);
    expect(visible).not.toMatch(/owid:antarctic_sea_ice/);
    expect(html).not.toMatch(/owid:antarctic_sea_ice/);
    expect(visible).toContain('Our World in Data — Antarctic sea ice (NSIDC)');
    expect(html).toContain('Our World in Data — Antarctic sea ice (NSIDC)');
    expect(html).toContain('href="https://ourworldindata.org/grapher/antarctica-sea-ice-extent"');
    const context = heuristicInsight(seedFromPiece(minted.piece));
    expect(context).toMatch(/\.\s+The shape is the story/);
    expect(context).not.toMatch(/[^.!?]\s+The shape is the story/);
  });
});
