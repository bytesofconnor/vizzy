/**
 * @vitest-environment jsdom
 */
import { renderToSVG } from '@vizzy/core';
import { resolvePrompt } from '@vizzy/resolve';
import { describe, expect, it } from 'vitest';
import { mintDraft } from './from-prompt';
import { mintFromOfficial } from './official-mint';
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
    expect.soft(printedCounts(svg)).toEqual([]);
    expect.soft(svg.toLowerCase()).toContain('no published page');
  });

  it('does not print an end label when a line estimate has no published page', async () => {
    const minted = mintDraft(
      'Egg prices by year',
      { notes: 'Public lookup found no matching table.', urls: [] },
      {
        title: 'Egg prices',
        kicker: 'Estimate',
        note: 'No published page backs these numbers.',
        chartType: 'line',
        area: false,
        xLabel: 'Year',
        yLabel: 'Price',
        sourceLabel: 'Estimate',
        sourceMethod: 'estimate',
        evidence: 'lookup failed',
        rows: [
          { x: '2019', y: 12 },
          { x: '2020', y: 40 },
        ],
      }
    );
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const svg = await renderToSVG(minted.piece.config, minted.piece.data);
    expect(visibleText(svg).join(' ')).not.toMatch(/(?<![\d.])(?:12|40)(?![\d.])/);
  });
});

function printedCounts(svg: string): string[] {
  return visibleText(svg).filter((value) => /\d/.test(value));
}

function visibleText(svg: string): string[] {
  const text = [...svg.matchAll(/>([^<]*)</g)].map((match) => match[1]?.replace(/&nbsp;/g, ' ').trim() ?? '');
  const names = [...svg.matchAll(/aria-label="([^"]*)"/g)].map((match) => match[1] ?? '');
  return [...text, ...names].filter(Boolean);
}
