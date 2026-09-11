import { describe, expect, it } from 'vitest';
import { validateChartRequest } from '../validate';
import { SAMPLE_REVENUE, barConfig } from './fixtures';

describe('validateChartRequest', () => {
  it('accepts a valid bar config and dataset', () => {
    const result = validateChartRequest(barConfig(), SAMPLE_REVENUE);
    expect(result.valid).toBe(true);
    expect(result.config?.chart.type).toBe('bar');
    expect(result.config?.schemaVersion).toBe(1);
  });

  it('reports a missing mapped column', () => {
    const result = validateChartRequest(
      { chart: { type: 'bar' }, dataMapping: { x: 'month', y: 'missing' } },
      SAMPLE_REVENUE
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.path === 'dataMapping.y' && issue.code === 'MISSING_FIELD')).toBe(true);
    expect(result.issues[0]?.suggestion).toContain('revenue');
  });

  it('reports a non-numeric y column', () => {
    const result = validateChartRequest(
      { chart: { type: 'bar' }, dataMapping: { x: 'revenue', y: 'month' } },
      SAMPLE_REVENUE
    );
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.code === 'NOT_NUMERIC')).toBe(true);
  });

  it('treats empty data as valid config with a warning issue', () => {
    const result = validateChartRequest(barConfig(), []);
    expect(result.valid).toBe(true);
    expect(result.issues.some((issue) => issue.code === 'EMPTY_DATA')).toBe(true);
  });

  it('keeps an optional source on a valid config', () => {
    const result = validateChartRequest(
      {
        ...barConfig(),
        source: {
          label: 'BLS CES',
          url: 'https://www.bls.gov/ces/',
          retrieved: '2026-09-11',
          method: 'official',
          evidence: 'monthly seasonally adjusted',
        },
      },
      SAMPLE_REVENUE
    );
    expect(result.valid).toBe(true);
    expect(result.config?.source?.label).toBe('BLS CES');
    expect(result.config?.source?.method).toBe('official');
  });

  it('rejects a config without chart type', () => {
    const result = validateChartRequest({ dataMapping: { x: 'month', y: 'revenue' } }, SAMPLE_REVENUE);
    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
