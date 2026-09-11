import { describe, expect, it } from 'vitest';
import { compileChart } from '../compile';
import { suggestChart } from '../suggest';
import { SAMPLE_REVENUE, barConfig } from './fixtures';

describe('suggestChart', () => {
  it('suggests a bar chart for categorical x + numeric y', () => {
    const suggestions = suggestChart(SAMPLE_REVENUE);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some((item) => item.config.chart.type === 'bar')).toBe(true);
  });

  it('honors an explicit chart type hint', () => {
    const suggestions = suggestChart(SAMPLE_REVENUE, { chartType: 'scatter' });
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.config.chart.type).toBe('scatter');
  });
});

describe('compileChart', () => {
  it('returns a validated config and a react snippet', () => {
    const result = compileChart({ config: barConfig(), data: SAMPLE_REVENUE });
    expect(result.valid).toBe(true);
    expect(result.snippet.package).toBe('@vizzy/react');
    expect(result.snippet.tsx).toContain('VizzyChart');
    expect(result.snippet.tsx).not.toContain('d3.select');
  });

  it('infers a config when none is provided', () => {
    const result = compileChart({ data: SAMPLE_REVENUE });
    expect(result.valid).toBe(true);
    expect(result.config?.chart.type).toBeDefined();
  });

  it('does not invent component source on invalid input', () => {
    const result = compileChart({
      config: { chart: { type: 'bar' }, dataMapping: { x: 'nope', y: 'also-nope' } },
      data: SAMPLE_REVENUE,
    });
    expect(result.valid).toBe(false);
    expect(result.snippet.tsx).toContain('VizzyChart');
  });
});
