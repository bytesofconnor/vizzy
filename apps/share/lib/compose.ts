import { STUDIO } from './theme';
import type { Piece } from './pieces';
import { displayChartTitle } from './remix-prompt';
import { sourceCardLine } from './source';

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
    chart: {
      x: 16,
      y: 64,
      width: 688,
      height: 320,
      margin: { top: 22, right: 16, bottom: 80, left: 48 },
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
    chart: {
      x: 20,
      y: 80,
      width: 1160,
      height: 422,
      margin: { top: 40, right: 40, bottom: 96, left: 68 },
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
    chart: {
      x: 52,
      y: 96,
      width: 1496,
      height: 520,
      margin: { top: 44, right: 40, bottom: 104, left: 72 },
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

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

function titleMarkup(value: string, titleSize: number): string {
  const subSize = Math.max(10, Math.round(titleSize * 0.62));
  const drop = Math.max(3, Math.round(titleSize * 0.28));
  const chars = Array.from(value);
  let html = '';
  let index = 0;
  let reset = false;
  const flush = (text: string) => {
    if (!text) {
      return;
    }
    if (reset) {
      html += `<tspan font-size="${titleSize}" dy="-${drop}">${escapeXml(text)}</tspan>`;
      reset = false;
      return;
    }
    html += escapeXml(text);
  };
  while (index < chars.length) {
    const sub = SUBSCRIPT_DIGITS.indexOf(chars[index] ?? '');
    const sup = SUPERSCRIPT_DIGITS.indexOf(chars[index] ?? '');
    if (sub < 0 && sup < 0) {
      let run = '';
      while (
        index < chars.length &&
        SUBSCRIPT_DIGITS.indexOf(chars[index] ?? '') < 0 &&
        SUPERSCRIPT_DIGITS.indexOf(chars[index] ?? '') < 0
      ) {
        run += chars[index];
        index += 1;
      }
      flush(run);
      continue;
    }
    const table = sub >= 0 ? SUBSCRIPT_DIGITS : SUPERSCRIPT_DIGITS;
    const shift = sub >= 0 ? drop : -drop;
    let digits = '';
    while (index < chars.length && table.indexOf(chars[index] ?? '') >= 0) {
      digits += String(table.indexOf(chars[index] ?? ''));
      index += 1;
    }
    html += `<tspan font-size="${subSize}" dy="${shift}">${escapeXml(digits)}</tspan>`;
    reset = true;
  }
  return html;
}

function chartSvgBox(chartSvg: string): { width: number; height: number } {
  const open = chartSvg.match(/^<svg\b[^>]*>/i)?.[0] ?? '';
  const width = Number(open.match(/\bwidth="([\d.]+)"/)?.[1] ?? NaN);
  const height = Number(open.match(/\bheight="([\d.]+)"/)?.[1] ?? NaN);
  const view = open.match(/\bviewBox="\s*0(?:\.0+)?\s+0(?:\.0+)?\s+([\d.]+)\s+([\d.]+)\s*"/);
  return {
    width: Number.isFinite(width) && width > 0 ? width : Number(view?.[1] ?? 1),
    height: Number.isFinite(height) && height > 0 ? height : Number(view?.[2] ?? 1),
  };
}

function innerSvg(chartSvg: string): string {
  return chartSvg
    .replace(/&nbsp;/g, '&#160;')
    .replace(/^<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '');
}

function wrapInsightLines(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n\s*\n/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      continue;
    }
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (next.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) {
      lines.push(line);
    }
  }
  return lines.slice(0, 10);
}

function exportAttributionMarkup(
  size: CardSize,
  width: number,
  totalHeight: number,
  pad: number
): string {
  const fontSize = size === 'lg' ? 13 : size === 'sm' ? 11 : 12;
  const y = totalHeight - Math.max(14, Math.round(pad * 0.32));
  const x = width - pad;
  return `<text x="${x}" y="${y}" text-anchor="end" fill="${STUDIO.mid}" font-size="${fontSize}" letter-spacing="0.03em" font-family="IBM Plex Mono, monospace">vizzy.run</text>`;
}

export function composePieceSvg(
  piece: Piece,
  chartSvg: string,
  size: CardSize = 'md',
  options?: { insight?: string }
): string {
  const spec = CARDS[size];
  const box = chartSvgBox(chartSvg);
  const chart = innerSvg(chartSvg);
  const chartX = spec.chart.x;
  const chartY = spec.chart.y;
  const chartWidth = spec.chart.width;
  const chartHeight = Math.max(120, Math.round((chartWidth * box.height) / Math.max(box.width, 1)));
  const noteY = chartY + chartHeight + 18;
  const maxChars = size === 'lg' ? 98 : size === 'sm' ? 74 : 90;
  const insightLines = options?.insight ? wrapInsightLines(options.insight, maxChars) : [];
  const insightLineHeight = spec.noteSize + 5;
  const insightStartY = noteY + spec.noteSize + 8;
  const insightBlock = insightLines.length ? insightLines.length * insightLineHeight : 0;
  const sourceY = insightLines.length ? insightStartY + insightBlock + 10 : noteY + 22;
  const totalHeight = sourceY + spec.sourceSize + 28;
  const insightMarkup = insightLines
    .map(
      (line, index) =>
        `<text x="${spec.pad}" y="${insightStartY + index * insightLineHeight}" fill="${STUDIO.mid}" font-size="${spec.noteSize}" font-family="IBM Plex Mono, monospace">${escapeXml(line)}</text>`
    )
    .join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${spec.width}" height="${totalHeight}" viewBox="0 0 ${spec.width} ${totalHeight}">
  <rect width="100%" height="100%" fill="${STUDIO.paper}"/>
  <text x="${spec.pad}" y="${spec.kickerY}" fill="${STUDIO.mute}" font-size="${spec.kickerSize}" letter-spacing="1.2" font-family="IBM Plex Mono, monospace">${escapeXml(piece.kicker.toUpperCase())}</text>
  <text x="${spec.pad}" y="${spec.titleY}" fill="${STUDIO.ink}" font-size="${spec.titleSize}" font-family="Archivo, Helvetica, sans-serif">${titleMarkup(displayChartTitle(piece.title, piece.note), spec.titleSize)}</text>
  <svg x="${chartX}" y="${chartY}" width="${chartWidth}" height="${chartHeight}" viewBox="0 0 ${box.width} ${box.height}" preserveAspectRatio="xMidYMid meet">
    ${chart}
  </svg>
  <text x="${spec.pad}" y="${noteY}" fill="${STUDIO.mute}" font-size="${spec.noteSize}" font-family="IBM Plex Mono, monospace">${escapeXml(piece.note)}</text>
  ${insightMarkup}
  ${piece.config.source ? `<text x="${spec.pad}" y="${sourceY}" fill="${STUDIO.mute}" font-size="${spec.sourceSize}" font-family="IBM Plex Mono, monospace">${escapeXml(`SOURCE  ${sourceCardLine(piece.config.source)}`)}</text>` : ''}
  ${exportAttributionMarkup(size, spec.width, totalHeight, spec.pad)}
</svg>`;
}
