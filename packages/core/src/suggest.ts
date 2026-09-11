import { ChartConfig, ChartConfigSchema } from './types';

export interface ChartSuggestion {
  config: ChartConfig;
  confidence: number;
  reason: string;
}

export interface SuggestHints {
  chartType?: 'bar' | 'line' | 'scatter';
  title?: string;
}

function isNumeric(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.isFinite(Number(value));
  }
  return false;
}

function looksTemporal(name: string): boolean {
  return /date|time|month|year|week|day|period/i.test(name);
}

function buildConfig(
  type: 'bar' | 'line' | 'scatter',
  x: string,
  y: string,
  title?: string
): ChartConfig {
  return ChartConfigSchema.parse({
    schemaVersion: 1,
    chart: { type },
    dataMapping: { x, y },
    accessibility: title
      ? { enabled: true, title }
      : { enabled: true },
  });
}

/**
 * Heuristic chart suggestions from a table. No model.
 */
export function suggestChart(
  data: unknown,
  hints: SuggestHints = {}
): ChartSuggestion[] {
  if (!Array.isArray(data) || data.length === 0 || typeof data[0] !== 'object' || data[0] === null) {
    return [];
  }

  const sample = data[0] as Record<string, unknown>;
  const columns = Object.keys(sample);
  const numericCols = columns.filter((key) =>
    data.every((row) => {
      if (!row || typeof row !== 'object') return false;
      const value = (row as Record<string, unknown>)[key];
      return value == null || isNumeric(value);
    }) && data.some((row) => isNumeric((row as Record<string, unknown>)[key]))
  );
  const categoricalCols = columns.filter((key) => !numericCols.includes(key));
  const temporalCols = columns.filter((key) => looksTemporal(key));

  const xCat = temporalCols[0] ?? categoricalCols[0] ?? columns[0];
  const yNum = numericCols[0];
  const xNum = numericCols[0];
  const yNumAlt = numericCols[1] ?? numericCols[0];

  if (!xCat || !yNum) {
    return [];
  }

  const suggestions: ChartSuggestion[] = [];

  if (hints.chartType === 'bar' || hints.chartType === 'line' || hints.chartType === 'scatter') {
    const x = hints.chartType === 'scatter' ? (xNum ?? xCat) : xCat;
    const y = hints.chartType === 'scatter' ? (yNumAlt ?? yNum) : yNum;
    if (x && y) {
      suggestions.push({
        config: buildConfig(hints.chartType, x, y, hints.title),
        confidence: 0.9,
        reason: `Requested ${hints.chartType} using ${x} → ${y}`,
      });
    }
    return suggestions;
  }

  if (categoricalCols.length > 0 && numericCols.length > 0 && xCat && yNum) {
    suggestions.push({
      config: buildConfig('bar', xCat, yNum, hints.title),
      confidence: temporalCols.length > 0 ? 0.7 : 0.88,
      reason: `Categorical '${xCat}' with numeric '${yNum}' maps to a bar chart`,
    });
  }

  if ((temporalCols.length > 0 || numericCols.length > 0) && yNum) {
    const x = temporalCols[0] ?? xCat;
    if (x) {
      suggestions.push({
        config: buildConfig('line', x, yNum, hints.title),
        confidence: temporalCols.length > 0 ? 0.86 : 0.55,
        reason: temporalCols.length > 0
          ? `Time-like '${x}' with numeric '${yNum}' maps to a line chart`
          : `Numeric series on '${x}' can be a line chart`,
      });
    }
  }

  if (numericCols.length >= 2 && xNum && yNumAlt && xNum !== yNumAlt) {
    suggestions.push({
      config: buildConfig('scatter', xNum, yNumAlt, hints.title),
      confidence: 0.8,
      reason: `Two numeric columns '${xNum}' and '${yNumAlt}' map to a scatter plot`,
    });
  }

  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}
