import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { renderToSVG, validateChartConfig, type ChartConfig, type DataPoint } from '@vizzy/core';
import { chartFrame, composePieceSvg } from './compose';
import { mintPiece } from './mint';
import { rankedBarsShowValues } from './theme';
import type { Piece } from './pieces';
import { renderPiecePng } from './render-piece';

const PNG_SIGNATURE = '89504e470d0a1a0a';

const LINE_ROWS: DataPoint[] = [
  { year: '2016', rate: 4.0 },
  { year: '2017', rate: 4.2 },
  { year: '2018', rate: 3.9 },
  { year: '2019', rate: 3.6 },
  { year: '2020', rate: 4.0 },
  { year: '2021', rate: 11.6 },
  { year: '2022', rate: 6.0 },
  { year: '2023', rate: 4.8 },
  { year: '2024', rate: 4.3 },
  { year: '2025', rate: 4.1 },
];

const BAR_ROWS: DataPoint[] = [
  { country: 'Qatar', tonnes: 34.4 },
  { country: 'Bahrain', tonnes: 25.7 },
  { country: 'Kuwait', tonnes: 23.1 },
  { country: 'United Arab Emirates', tonnes: 21.4 },
  { country: 'Brunei', tonnes: 20.8 },
  { country: 'Trinidad and Tobago', tonnes: 18.6 },
  { country: 'Saudi Arabia', tonnes: 16.9 },
  { country: 'Oman', tonnes: 15.4 },
  { country: 'Australia', tonnes: 14.8 },
  { country: 'United States', tonnes: 14.3 },
  { country: 'Canada', tonnes: 14.1 },
  { country: 'Kazakhstan', tonnes: 13.2 },
];

const LONG_LINE: DataPoint[] = Array.from({ length: 16 }, (_item, index) => ({
  year: String(2010 + index),
  rate: 4 + (index % 5) * 0.4,
}));

function withDom<T>(run: () => Promise<T>): Promise<T> {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    pretendToBeVisual: true,
    url: 'http://127.0.0.1/',
  });
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    HTMLElement: globalThis.HTMLElement,
    SVGElement: globalThis.SVGElement,
    Node: globalThis.Node,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    SVGElement: dom.window.SVGElement,
    Node: dom.window.Node,
  });
  return run().finally(() => {
    Object.assign(globalThis, previous);
    dom.window.close();
  });
}

function framed(config: ChartConfig): ChartConfig {
  const frame = chartFrame('md');
  return validateChartConfig({
    ...config,
    dimensions: {
      ...config.dimensions,
      width: frame.width,
      height: frame.height,
      margin: frame.margin,
    },
  });
}

async function cardFor(piece: Piece): Promise<string> {
  return withDom(async () => {
    const svg = await renderToSVG(framed(piece.config), piece.data);
    return composePieceSvg(piece, svg, 'md');
  });
}

function openingTag(card: string, className: string): string {
  const match = card.match(new RegExp(`<text\\b[^>]*class="[^"]*${className}[^"]*"[^>]*>`));
  return match?.[0] ?? '';
}

function axisTitleGap(card: string): number {
  const slot = card.match(
    /<svg x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)" viewBox="0 0 ([\d.]+) ([\d.]+)"/
  );
  const axis = card.match(/<g class="x-axis" transform="translate\([\d.]+,\s*([\d.]+)\)"/);
  const label = card.match(
    /<g class="x-axis"[\s\S]*?<text class="axis-label"[^>]*\by="([\d.]+)"/
  );
  const noteY = Number(card.match(/\by="([\d.]+)"[^>]*>Published/)?.[1]);
  const svgY = Number(axis?.[1]) + Number(label?.[1]);
  const titleY = Number(slot?.[2]) + (svgY / Number(slot?.[6])) * Number(slot?.[4]);
  return noteY - titleY;
}

function linePath(card: string): string {
  const match = card.match(/<path\b[^>]*class="[^"]*\bline\b[^"]*"[^>]*>/);
  return match?.[0]?.match(/\bd="([^"]+)"/)?.[1] ?? '';
}

function barBoxes(card: string): Array<{ width: number; height: number; fill: string }> {
  return [...card.matchAll(/<rect\b[^>]*class="bar"[^>]*>/g)].map((match) => {
    const tag = match[0];
    return {
      width: Number(tag.match(/\bwidth="([\d.]+)"/)?.[1] ?? 0),
      height: Number(tag.match(/\bheight="([\d.]+)"/)?.[1] ?? 0),
      fill: tag.match(/\bfill="([^"]+)"/)?.[1] ?? '',
    };
  });
}

function mintedLine(): Piece {
  const minted = mintPiece({
    kicker: 'Rates',
    title: 'A rate with a peak',
    note: 'Published through 2025. The peak year is labeled on the line.',
    source: { label: 'Example series', method: 'official', url: 'https://example.com/rate' },
    data: LINE_ROWS,
    config: {
      schemaVersion: 1,
      chart: { type: 'line' },
      dataMapping: { x: 'year', y: 'rate' },
      axes: {
        x: { label: 'Year' },
        y: { label: 'Rate %' },
      },
    },
  });
  if (!minted.ok) {
    throw new Error(minted.error);
  }
  return minted.piece;
}

function mintedBars(): Piece {
  const minted = mintPiece({
    kicker: 'Climate',
    title: 'CO₂ per person, top countries',
    note: 'Ranked by the latest published year. Values are tonnes per person.',
    source: { label: 'Example inventory', method: 'official', url: 'https://example.com/co2' },
    data: BAR_ROWS,
    config: {
      schemaVersion: 1,
      chart: { type: 'bar' },
      dataMapping: { x: 'country', y: 'tonnes' },
      axes: {
        x: { label: 'Country' },
        y: { label: 'Tonnes per person' },
      },
    },
  });
  if (!minted.ok) {
    throw new Error(minted.error);
  }
  return minted.piece;
}

describe('png fidelity', () => {
  it('paints the peak and the end value on a straight line', async () => {
    const piece = mintedLine();
    expect(piece.config.chart.type === 'line' && piece.config.chart.curve).toBe('linear');
    const card = await cardFor(piece);
    const png = await renderPiecePng(piece, 'md');

    expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
    expect(card).not.toContain('var(');
    for (const className of ['inflection-label', 'end-label']) {
      const tag = openingTag(card, className);
      expect(tag, className).toContain('paint-order="stroke"');
      expect(tag, className).toMatch(/\bstroke="/);
    }
    expect(card).toMatch(/class="[^"]*inflection-label[^"]*"[^>]*>11\.6</);
    expect(card).toMatch(/class="[^"]*end-label[^"]*"[^>]*>4\.1</);
    expect(linePath(card)).not.toMatch(/[Cc]/);
    const stored = framed({
      ...piece.config,
      chart: { ...piece.config.chart, type: 'line', curve: 'monotone' },
    });
    const storedSvg = await withDom(() => renderToSVG(stored, piece.data));
    expect(linePath(storedSvg)).not.toMatch(/[Cc]/);
    expect(card.match(/class="point /g)?.length).toBe(LINE_ROWS.length);

    const gap = axisTitleGap(card);
    expect(gap).toBeGreaterThan(12);
    expect(gap).toBeLessThan(48);
  });

  it('keeps a ranked CO₂ title in Archivo and paints one ink with values', async () => {
    const piece = mintedBars();
    expect(piece.config.chart.type === 'bar' && piece.config.chart.showValues).toBe(true);
    const card = await cardFor(piece);
    const png = await renderPiecePng(piece, 'md');

    expect(png.subarray(0, 8).toString('hex')).toBe(PNG_SIGNATURE);
    expect(card).not.toContain('var(');
    expect(card).not.toContain('₂');
    const title = card.match(/<text\b[^>]*\bfont-family="([^"]+)"[^>]*>CO/);
    expect(title?.[1]?.startsWith('Archivo')).toBe(true);
    expect(card).toContain('>34.4<');
    const stored = validateChartConfig({
      ...piece.config,
      chart: { ...piece.config.chart, showValues: false },
    });
    expect(stored.chart.type === 'bar' && stored.chart.showValues).toBe(false);
    const restored = await cardFor({ ...piece, config: rankedBarsShowValues(stored) });
    expect(restored).toContain('>34.4<');
    expect(card).toContain('United Arab Emirates');

    const bars = barBoxes(card);
    expect(bars.length).toBe(BAR_ROWS.length);
    expect(new Set(bars.map((bar) => bar.fill))).toEqual(new Set(['#121211']));

    const narrow = await withDom(async () => {
      const frame = chartFrame('md');
      const config = validateChartConfig({
        ...piece.config,
        dimensions: {
          ...piece.config.dimensions,
          width: 390,
          height: 640,
          margin: frame.margin,
        },
      });
      return renderToSVG(config, piece.data);
    });
    const phone = barBoxes(narrow);
    expect(phone.length).toBe(BAR_ROWS.length);
    expect(phone.every((bar) => bar.width > bar.height)).toBe(true);
    expect(narrow).not.toMatch(/transform="rotate/);
    expect(narrow).toContain('Trinidad and Tobago');
  });

  it('draws an end dot instead of a dot on every point of a long line', async () => {
    const minted = mintPiece({
      title: 'A long rate',
      note: 'Sixteen published years.',
      source: { label: 'Example series', method: 'official', url: 'https://example.com/long' },
      data: LONG_LINE,
      config: {
        schemaVersion: 1,
        chart: { type: 'line' },
        dataMapping: { x: 'year', y: 'rate' },
        axes: { x: { label: 'Year' }, y: { label: 'Rate %' } },
      },
    });
    if (!minted.ok) {
      throw new Error(minted.error);
    }
    const card = await cardFor(minted.piece);
    expect(card.match(/class="point /g)).toBeNull();
    expect(card).toMatch(/class="[^"]*end-cap/);
  });
});
