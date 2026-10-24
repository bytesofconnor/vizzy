/**
 * @vitest-environment jsdom
 */
import { renderToSVG, validateChartConfig, type ChartConfig, type DataPoint } from '@vizzy/core';
import { describe, expect, it } from 'vitest';
import { composePieceSvg } from './compose';
import type { Piece } from './pieces';

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
});
