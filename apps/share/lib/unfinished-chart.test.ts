/**
 * @vitest-environment jsdom
 */
import { renderToSVG, validateChartConfig, type ChartConfig, type DataPoint } from '@vizzy/core';
import { describe, expect, it } from 'vitest';
import { composePieceSvg } from './compose';
import { mintDraft } from './from-prompt';
import type { Piece } from './pieces';
import { parseChartSeed, seedBriefing, seedFromPiece } from './seed';
import { sourceCardLine } from './source';

function plot(
  source: NonNullable<ChartConfig['source']>,
  chart: { showValues?: boolean } = {}
): ChartConfig {
  return validateChartConfig({
    schemaVersion: 1,
    chart: { type: 'bar', showValues: true, barPadding: 0.32, ...chart },
    dataMapping: { x: 'x', y: 'y' },
    dimensions: {
      width: 640,
      height: 360,
      margin: { top: 28, right: 16, bottom: 56, left: 48 },
    },
    animation: { enabled: false, duration: 0, stagger: 0 },
    legend: { show: false },
    interaction: { hover: false, tooltip: false, click: false },
    axes: {
      x: { show: true, grid: false, label: 'Category' },
      y: { show: true, grid: true, tickCount: 5, label: 'Value' },
    },
    source,
  });
}

function viewOf(svg: string): Document {
  return new DOMParser().parseFromString(svg.replace(/&nbsp;/g, '&#160;'), 'image/svg+xml');
}

function textOf(node: Element | null): string {
  return (node?.textContent ?? '').replace(/\u00a0/g, ' ').trim();
}

function pieceFor(config: ChartConfig, data: DataPoint[], title: string): Piece {
  return {
    slug: 'x/unfinished',
    kicker: 'Illustrative',
    title,
    note: 'Hand-built fixture.',
    config,
    data,
  };
}

describe('unfinished bars', () => {
  it('draws a sketch as dashed outlines with one Unfinished stamp', async () => {
    const rows = [
      { x: 'Found a link', y: 17 },
      { x: 'Found no link', y: 83 },
    ];
    const config = plot({
      label: 'No published source',
      method: 'estimate',
      evidence: 'Public lookup found no matching page for this question.',
    });
    const svg = await renderToSVG(config, rows);
    const view = viewOf(svg);
    const sketches = [...view.querySelectorAll('rect.bar-sketch')];
    expect(textOf(view.querySelector('.bar-sketch-stamp'))).toBe('Unfinished');
    expect(sketches).toHaveLength(2);
    expect(sketches.map((rect) => rect.getAttribute('aria-label'))).toEqual([
      'Found a link: 17, unfinished',
      'Found no link: 83, unfinished',
    ]);
    for (const rect of sketches) {
      expect(rect.getAttribute('fill')).toBe('none');
      expect(rect.getAttribute('stroke-dasharray')).toBe('1.5 5');
      expect(rect.classList.contains('bar')).toBe(true);
    }
    expect(view.querySelector('.y-axis')).toBeNull();
    expect(view.querySelector('.y-grid')).toBeNull();
    expect(view.querySelector('.bar-blank')).toBeNull();
    const printed = [...view.querySelectorAll('text')].map((node) => textOf(node)).filter(Boolean);
    expect(printed.filter((text) => /^-?\d/.test(text))).toEqual([]);
    expect(composePieceSvg(pieceFor(config, rows, 'Studies on vaccines and autism'), svg, 'sm')).toContain(
      'Unfinished'
    );
    expect(config.axes.y.show).toBe(true);
    expect(config.chart.type === 'bar' && config.chart.showValues).toBe(true);
  });

  it('names an empty slot and draws no rect for it', async () => {
    const rows = [
      { x: '18-29', y: 27 },
      { x: '30-49', y: 35 },
      { x: '50-64', y: null },
      { x: '65+', y: null },
    ];
    const svg = await renderToSVG(
      plot(
        {
          label: 'Gallup',
          method: 'scraped',
          url: 'https://news.gallup.com/poll/1645/guns.aspx',
          evidence: 'Age bands published on the Gallup page.',
        },
        { showValues: false }
      ),
      rows
    );
    const view = viewOf(svg);
    const blanks = [...view.querySelectorAll('text.bar-blank')];
    const bars = [...view.querySelectorAll('rect.bar')];

    expect(blanks.map((node) => textOf(node))).toEqual(['empty', 'empty']);
    expect(blanks.map((node) => node.getAttribute('aria-label'))).toEqual([
      '50-64: empty',
      '65+: empty',
    ]);
    expect(bars.map((rect) => rect.getAttribute('aria-label'))).toEqual(['18-29: 27', '30-49: 35']);
    expect(bars.every((rect) => !rect.classList.contains('bar-sketch'))).toBe(true);
    expect(view.querySelector('.bar-sketch-stamp')).toBeNull();
    expect(textOf(view.querySelector('.bar-zero'))).toBe('');
  });

  it('paints a measured zero as 0', async () => {
    const rows = [
      { x: 'Japan', y: 0 },
      { x: 'USA', y: 42 },
    ];
    const svg = await renderToSVG(
      plot(
        {
          label: 'Official table',
          method: 'official',
          url: 'https://example.com/ownership',
          evidence: 'Pasted from the published table.',
        },
        { showValues: false }
      ),
      rows
    );
    const view = viewOf(svg);
    const japan = [...view.querySelectorAll('rect.bar')].find((rect) =>
      rect.getAttribute('aria-label')?.startsWith('Japan')
    );
    const printed = [...view.querySelectorAll('text')].map((node) => textOf(node));

    expect(japan?.getAttribute('aria-label')).toBe('Japan: 0');
    expect(textOf(view.querySelector('text.bar-zero'))).toBe('0');
    expect(printed).not.toContain('empty');
    expect(printed).not.toContain('Unfinished');
    expect(view.querySelector('.bar-sketch-stamp')).toBeNull();
    expect(view.querySelector('rect.bar-sketch')).toBeNull();
  });

  it('mints an estimate as unfinished outlines', async () => {
    const minted = mintDraft(
      'Do vaccines cause autism? How many studies found a link?',
      { notes: 'Public lookup found no matching table.', urls: [] },
      draft({
        title: 'Studies on vaccines and autism',
        kicker: 'Estimate',
        note: 'No published page backs these numbers.',
        xLabel: 'Finding',
        yLabel: 'Studies',
        sourceLabel: 'Estimate',
        sourceMethod: 'estimate',
        evidence: 'lookup failed',
        rows: [
          { x: 'Found a link', y: 17 },
          { x: 'Found no link', y: 83 },
        ],
      })
    );
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const source = minted.piece.config.source!;
    const svg = await renderToSVG(minted.piece.config, minted.piece.data);
    const view = viewOf(svg);
    const sketches = [...view.querySelectorAll('rect.bar-sketch')];
    const printed = [...view.querySelectorAll('text')].map((node) => textOf(node)).filter(Boolean);

    expect(source.method).toBe('estimate');
    expect(source.url).toBeUndefined();
    expect(minted.piece.config.axes.y.show).toBe(false);
    expect(sourceCardLine(source).toLowerCase()).toContain('no published page');
    expect(textOf(view.querySelector('.bar-sketch-stamp'))).toBe('Unfinished');
    expect(sketches).toHaveLength(2);
    for (const rect of sketches) {
      expect(rect.getAttribute('fill')).toBe('none');
      expect(rect.getAttribute('stroke-dasharray')).toBe('1.5 5');
    }
    expect(printed.filter((text) => /^-?\d/.test(text))).toEqual([]);
    expect(composePieceSvg(minted.piece, svg, 'sm')).toContain('Unfinished');
  });

  it('mints unattested age-band zeros as empty slots', async () => {
    const notes = [
      '| Age | Share |',
      '| --- | --- |',
      '| 18-29 | 27 |',
      '| 30-49 | 35 |',
      '| 50-64 | 18 |',
      '| 65+ | 22 |',
    ].join('\n');
    const minted = mintDraft(
      'Gun ownership by age',
      { notes, urls: ['https://news.gallup.com/poll/1645/guns.aspx'] },
      draft({
        title: 'Gun ownership by age',
        xLabel: 'Age',
        yLabel: 'Share %',
        sourceLabel: 'Gallup',
        sourceMethod: 'scraped',
        evidence: 'Age bands published on the Gallup page.',
        rows: [
          { x: '18-29', y: 27 },
          { x: '30-49', y: 35 },
          { x: '50-64', y: 0 },
          { x: '65+', y: 0 },
        ],
      })
    );
    expect(minted.ok).toBe(true);
    if (!minted.ok) {
      return;
    }
    const svg = await renderToSVG(minted.piece.config, minted.piece.data);
    const view = viewOf(svg);
    const blanks = [...view.querySelectorAll('text.bar-blank')];
    const bars = [...view.querySelectorAll('rect.bar')];
    const card = composePieceSvg(minted.piece, svg, 'sm');

    expect(minted.piece.data.map((row) => row.y)).toEqual([27, 35, null, null]);
    expect(minted.piece.config.source?.method).toBe('scraped');
    expect(minted.piece.config.source?.url).toContain('gallup.com');
    expect(blanks.map((node) => textOf(node))).toEqual(['empty', 'empty']);
    expect(blanks.map((node) => node.getAttribute('aria-label'))).toEqual([
      '50-64: empty',
      '65+: empty',
    ]);
    expect(bars.map((rect) => rect.getAttribute('aria-label'))).toEqual(['18-29: 27', '30-49: 35']);
    expect(bars.every((rect) => !rect.classList.contains('bar-sketch'))).toBe(true);
    expect(view.querySelector('.bar-sketch-stamp')).toBeNull();
    expect(card).toContain('empty');
    expect(card).not.toContain('Unfinished');
  });

  it('keeps a pasted zero and a notes zero', async () => {
    const pasted = mintDraft(
      'Japan, 0\nUSA, 42\nCanada, 8',
      { notes: '', urls: [] },
      draft({
        title: 'Guns per person',
        sourceLabel: 'Entered figures',
        sourceMethod: 'manual',
        evidence: 'The user typed these figures.',
        rows: [
          { x: 'Japan', y: 0 },
          { x: 'USA', y: 42 },
          { x: 'Canada', y: 8 },
        ],
      })
    );
    const noted = mintDraft(
      'Gun ownership for Japan, the USA, Brazil, and Canada',
      {
        notes: [
          '| Country | Guns |',
          '| --- | --- |',
          '| Japan | 0 |',
          '| USA | 42 |',
          '| Brazil | 12 |',
          '| Canada | 8 |',
        ].join('\n'),
        urls: ['https://example.com/guns'],
      },
      draft({
        title: 'Guns per person',
        xLabel: 'Country',
        sourceLabel: 'Example research',
        sourceMethod: 'scraped',
        evidence: 'Country rows copied from the looked-up table.',
        rows: [
          { x: 'Japan', y: 0 },
          { x: 'USA', y: 42 },
          { x: 'Brazil', y: 12 },
          { x: 'Canada', y: 8 },
        ],
      })
    );

    for (const minted of [pasted, noted]) {
      expect(minted.ok).toBe(true);
      if (!minted.ok) {
        return;
      }
      const svg = await renderToSVG(minted.piece.config, minted.piece.data);
      const view = viewOf(svg);
      const printed = [...view.querySelectorAll('text')].map((node) => textOf(node));
      const japan = [...view.querySelectorAll('rect.bar')].find((rect) =>
        rect.getAttribute('aria-label')?.startsWith('Japan')
      );
      expect(japan?.getAttribute('aria-label')).toBe('Japan: 0');
      expect(textOf(view.querySelector('text.bar-zero'))).toBe('0');
      expect(printed).not.toContain('empty');
      expect(printed).not.toContain('Unfinished');
    }
  });

  it('keeps an estimate a sketch when revise has no lookup and no paste', async () => {
    const first = mintDraft(
      'Do vaccines cause autism? How many studies found a link?',
      { notes: 'Public lookup found no matching table.', urls: [] },
      draft({
        title: 'Studies on vaccines and autism',
        kicker: 'Estimate',
        note: 'No published page backs these numbers.',
        xLabel: 'Finding',
        yLabel: 'Studies',
        sourceLabel: 'Estimate',
        sourceMethod: 'estimate',
        evidence: 'lookup failed',
        rows: [
          { x: 'Found a link', y: 17 },
          { x: 'Found no link', y: 83 },
        ],
      })
    );
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const second = mintDraft(
      'Say it more plainly',
      { notes: '', urls: [] },
      draft({
        title: 'Studies on vaccines and autism',
        kicker: 'Official',
        note: 'Published counts.',
        xLabel: 'Finding',
        yLabel: 'Studies',
        sourceLabel: 'CDC',
        sourceMethod: 'official',
        evidence: 'Counts from the published review.',
        rows: [
          { x: 'Found a link', y: 17 },
          { x: 'Found no link', y: 83 },
        ],
      }),
      seedFromPiece(first.piece)
    );
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    const svg = await renderToSVG(second.piece.config, second.piece.data);
    const view = viewOf(svg);
    expect(textOf(view.querySelector('.bar-sketch-stamp'))).toBe('Unfinished');
    expect(second.piece.config.source?.method).toBe('estimate');
    expect(second.piece.config.source?.url).toBeUndefined();
    expect(second.piece.config.axes.y.show).toBe(false);
    expect(view.querySelector('.y-axis')).toBeNull();
  });

  it('keeps an empty slot empty when revise emits zero again', async () => {
    const notes = [
      '| Age | Share |',
      '| --- | --- |',
      '| 18-29 | 27 |',
      '| 30-49 | 35 |',
      '| 50-64 | 18 |',
      '| 65+ | 22 |',
    ].join('\n');
    const rows = [
      { x: '18-29', y: 27 },
      { x: '30-49', y: 35 },
      { x: '50-64', y: 0 },
      { x: '65+', y: 0 },
    ];
    const first = mintDraft(
      'Gun ownership by age',
      { notes, urls: ['https://news.gallup.com/poll/1645/guns.aspx'] },
      draft({
        title: 'Gun ownership by age',
        xLabel: 'Age',
        yLabel: 'Share %',
        sourceLabel: 'Gallup',
        sourceMethod: 'scraped',
        evidence: 'Age bands published on the Gallup page.',
        rows,
      })
    );
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const seed = seedFromPiece(first.piece);
    expect(seed.rows.map((row) => row.y)).toEqual([27, 35, null, null]);
    expect(seedBriefing(seed)).toContain('50-64\tempty');
    expect(seedBriefing(seed)).not.toContain('50-64\t0');
    expect(parseChartSeed(JSON.parse(JSON.stringify(seed)))?.rows.map((row) => row.y)).toEqual([
      27, 35, null, null,
    ]);
    expect(
      parseChartSeed({
        ...seed,
        rows: seed.rows.map((row) => ({ x: row.x, y: row.y === null ? 'empty' : row.y })),
      })?.rows.map((row) => row.y)
    ).toEqual([27, 35, null, null]);

    const second = mintDraft(
      'Gun ownership by age',
      { notes: '', urls: [] },
      draft({
        title: 'Gun ownership by age',
        xLabel: 'Age',
        yLabel: 'Share %',
        sourceLabel: 'Gallup',
        sourceMethod: 'official',
        evidence: 'Age bands published on the Gallup page.',
        rows,
      }),
      seed
    );
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    const svg = await renderToSVG(second.piece.config, second.piece.data);
    const view = viewOf(svg);
    const blanks = [...view.querySelectorAll('text.bar-blank')];
    expect(second.piece.data.map((row) => row.y)).toEqual([27, 35, null, null]);
    expect(blanks.map((node) => textOf(node))).toEqual(['empty', 'empty']);
    expect(blanks.map((node) => node.getAttribute('aria-label'))).toEqual([
      '50-64: empty',
      '65+: empty',
    ]);
    expect(textOf(view.querySelector('.bar-sketch-stamp'))).not.toBe('Unfinished');
    expect([...view.querySelectorAll('text')].map((node) => textOf(node))).not.toContain('Unfinished');
  });

  it('keeps an attested zero across revise', async () => {
    const rows = [
      { x: 'Japan', y: 0 },
      { x: 'USA', y: 42 },
      { x: 'Brazil', y: 12 },
      { x: 'Canada', y: 8 },
    ];
    const first = mintDraft(
      'Gun ownership for Japan, the USA, Brazil, and Canada',
      {
        notes: [
          '| Country | Guns |',
          '| --- | --- |',
          '| Japan | 0 |',
          '| USA | 42 |',
          '| Brazil | 12 |',
          '| Canada | 8 |',
        ].join('\n'),
        urls: ['https://example.com/guns'],
      },
      draft({
        title: 'Guns per person',
        xLabel: 'Country',
        sourceLabel: 'Example research',
        sourceMethod: 'scraped',
        evidence: 'Country rows copied from the looked-up table.',
        rows,
      })
    );
    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }
    const seed = seedFromPiece(first.piece);
    expect(seed.rows.find((row) => row.x === 'Japan')?.y).toBe(0);
    const second = mintDraft(
      'Keep the countries',
      { notes: '', urls: [] },
      draft({
        title: 'Guns per person',
        xLabel: 'Country',
        sourceLabel: 'Estimate',
        sourceMethod: 'estimate',
        evidence: 'lookup failed',
        rows,
      }),
      seed
    );
    expect(second.ok).toBe(true);
    if (!second.ok) {
      return;
    }
    const svg = await renderToSVG(second.piece.config, second.piece.data);
    const view = viewOf(svg);
    const printed = [...view.querySelectorAll('text')].map((node) => textOf(node));
    const japan = [...view.querySelectorAll('rect.bar')].find((rect) =>
      rect.getAttribute('aria-label')?.startsWith('Japan')
    );
    expect(japan?.getAttribute('aria-label')).toBe('Japan: 0');
    expect(textOf(view.querySelector('text.bar-zero'))).toBe('0');
    expect(printed).not.toContain('empty');
    expect(printed).not.toContain('Unfinished');
  });
});

function draft(overrides: {
  title: string;
  rows: Array<{ x: string; y: number }>;
  kicker?: string;
  note?: string;
  xLabel?: string;
  yLabel?: string;
  sourceLabel?: string;
  sourceMethod?: 'official' | 'export' | 'scraped' | 'estimate' | 'manual' | 'example' | 'unknown';
  evidence?: string;
}) {
  return {
    title: overrides.title,
    kicker: overrides.kicker ?? 'Chart',
    note: overrides.note ?? 'Published figures.',
    chartType: 'bar' as const,
    area: false,
    xLabel: overrides.xLabel ?? 'Category',
    yLabel: overrides.yLabel ?? 'Value',
    sourceLabel: overrides.sourceLabel ?? 'Public table',
    sourceMethod: overrides.sourceMethod ?? 'scraped',
    evidence: overrides.evidence ?? 'Rows copied from the looked-up table.',
    rows: overrides.rows,
  };
}
