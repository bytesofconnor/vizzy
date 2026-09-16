import { validateChartConfig, type DataPoint } from '@vizzy/core';
import type { Piece } from './pieces';
import { printColorScheme } from './theme';

export function wantsPrintGrayscale(asked: string): boolean {
  const text = asked.trim();
  if (/\bgrayscale for print\b/i.test(text) || /\bgreyscale for print\b/i.test(text)) {
    return true;
  }
  const style = /\b(grayscale|greyscale|monochrome|black\s*and\s*white|b&w)\b/i.test(text);
  const context = /\b(print|newsletter|pdf|article|newspaper|magazine|paper)\b/i.test(text);
  return style && context;
}

export function isGrayscaleOnlyRevision(asked: string): boolean {
  if (!wantsPrintGrayscale(asked)) {
    return false;
  }
  const stripped = asked
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(
      /\b(make|it|use|switch|convert|to|for|the|a|an|my|chart|version|please|grayscale|greyscale|monochrome|black|and|white|print|newsletter|pdf|article|newspaper|magazine|paper)\b/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim();
  return stripped.length === 0;
}

export function applyPrintGrayscale(
  config: Piece['config'],
  data: DataPoint[]
): { config: Piece['config']; data: DataPoint[] } {
  const colors = printColorScheme();
  const palette = colors.palette;
  let rows = data;

  if (config.dataMapping.color === 'tone') {
    const tones = [...new Set(rows.map((row) => String(row.tone ?? '')))].filter(Boolean);
    const toneMap = new Map(
      tones.map((tone, index) => [tone, palette[index % palette.length] ?? colors.primary])
    );
    rows = rows.map((row) => ({
      ...row,
      tone: toneMap.get(String(row.tone ?? '')) ?? palette[0] ?? colors.primary,
    }));
  }

  return {
    config: validateChartConfig({
      ...config,
      colors: {
        ...config.colors,
        ...colors,
      },
    }),
    data: rows,
  };
}
