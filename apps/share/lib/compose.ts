import { STUDIO } from './theme';
import type { Piece } from './pieces';
import { sourceLine } from './source';

export type CardSize = 'sm' | 'md' | 'lg';

export const CARD_SIZES: CardSize[] = ['sm', 'md', 'lg'];

export function parseCardSize(value: string | null | undefined): CardSize {
  if (value === 'sm' || value === 'md' || value === 'lg') {
    return value;
  }
  return 'md';
}

type CardSpec = {
  width: number;
  height: number;
  pad: number;
  kickerSize: number;
  titleSize: number;
  noteSize: number;
  sourceSize: number;
  kickerY: number;
  titleY: number;
  noteY: number;
  sourceY: number;
  chart: {
    x: number;
    y: number;
    width: number;
    height: number;
    margin: { top: number; right: number; bottom: number; left: number };
  };
};

export const CARDS: Record<CardSize, CardSpec> = {
  sm: {
    width: 720,
    height: 480,
    pad: 28,
    kickerSize: 10,
    titleSize: 20,
    noteSize: 12,
    sourceSize: 11,
    kickerY: 26,
    titleY: 50,
    noteY: 404,
    sourceY: 428,
    chart: {
      x: 16,
      y: 64,
      width: 688,
      height: 320,
      margin: { top: 22, right: 12, bottom: 32, left: 26 },
    },
  },
  md: {
    width: 1200,
    height: 600,
    pad: 40,
    kickerSize: 11,
    titleSize: 22,
    noteSize: 12,
    sourceSize: 11,
    kickerY: 34,
    titleY: 62,
    noteY: 528,
    sourceY: 552,
    chart: {
      x: 20,
      y: 80,
      width: 1160,
      height: 422,
      margin: { top: 40, right: 40, bottom: 52, left: 48 },
    },
  },
  lg: {
    width: 1600,
    height: 740,
    pad: 52,
    kickerSize: 12,
    titleSize: 28,
    noteSize: 14,
    sourceSize: 12,
    kickerY: 40,
    titleY: 74,
    noteY: 656,
    sourceY: 686,
    chart: {
      x: 52,
      y: 96,
      width: 1496,
      height: 520,
      margin: { top: 44, right: 40, bottom: 56, left: 52 },
    },
  },
};

export const CARD = CARDS.md;

export function chartFrame(size: CardSize): { width: number; height: number; margin: CardSpec['chart']['margin'] } {
  const { width, height, margin } = CARDS[size].chart;
  if (size === 'md') {
    return { width: 1100, height: 400, margin };
  }
  return { width, height, margin };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/ /g, '\u00A0');
}

function innerSvg(chartSvg: string): string {
  return chartSvg
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');
}

export function composePieceSvg(
  piece: Piece,
  chartSvg: string,
  size: CardSize = 'md'
): string {
  const spec = CARDS[size];
  const frame = chartFrame(size);
  const chart = innerSvg(chartSvg);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${spec.height}" viewBox="0 0 ${spec.width} ${spec.height}">
  <rect width="100%" height="100%" fill="${STUDIO.paper}"/>
  <text x="${spec.pad}" y="${spec.kickerY}" fill="${STUDIO.mute}" font-size="${spec.kickerSize}" letter-spacing="1.2" font-family="IBM Plex Mono, monospace">${escapeXml(piece.kicker.toUpperCase())}</text>
  <text x="${spec.pad}" y="${spec.titleY}" fill="${STUDIO.ink}" font-size="${spec.titleSize}" font-family="Archivo, Helvetica, sans-serif">${escapeXml(piece.title)}</text>
  <svg x="${spec.chart.x}" y="${spec.chart.y}" width="${spec.chart.width}" height="${spec.chart.height}" viewBox="0 0 ${frame.width} ${frame.height}" preserveAspectRatio="xMidYMid meet">
    ${chart}
  </svg>
  <text x="${spec.pad}" y="${spec.noteY}" fill="${STUDIO.mute}" font-size="${spec.noteSize}" font-family="IBM Plex Mono, monospace">${escapeXml(piece.note)}</text>
  ${piece.config.source ? `<text x="${spec.pad}" y="${spec.sourceY}" fill="${STUDIO.mute}" font-size="${spec.sourceSize}" font-family="IBM Plex Mono, monospace">${escapeXml(`SOURCE  ${sourceLine(piece.config.source)}`)}</text>` : ''}
</svg>`;
}
