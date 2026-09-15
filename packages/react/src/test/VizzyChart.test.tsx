import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VizzyChart } from '../components/VizzyChart';
import { validateChartConfig } from '@vizzy/core';

const data = [
  { month: 'Jan', revenue: 4000 },
  { month: 'Feb', revenue: 3000 },
  { month: 'Mar', revenue: 2000 },
];

const config = validateChartConfig({
  schemaVersion: 1,
  chart: { type: 'bar' },
  dataMapping: { x: 'month', y: 'revenue' },
  dimensions: { width: 800, height: 400 },
  animation: { enabled: false, duration: 0 },
  accessibility: { enabled: true, title: 'Revenue' },
});

describe('VizzyChart', () => {
  it('mounts and draws an SVG', async () => {
    const { container } = render(<VizzyChart config={config} data={data} showPerformanceMetrics={false} />);
    await waitFor(() => {
      expect(container.querySelectorAll('rect.bar').length).toBe(3);
    });
  });

  it('exposes an accessible label', async () => {
    const { container } = render(<VizzyChart config={config} data={data} showPerformanceMetrics={false} />);
    await waitFor(() => {
      expect(container.querySelector('[aria-label="Revenue"], [aria-label="Monthly revenue"]')).toBeTruthy();
      expect(container.querySelector('svg title')?.textContent).toBe('Revenue');
    });
  });
});
