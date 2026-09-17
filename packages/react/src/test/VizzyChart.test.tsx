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

  it('exposes an accessible label without a native SVG title tooltip', async () => {
    const { container } = render(<VizzyChart config={config} data={data} showPerformanceMetrics={false} />);
    await waitFor(() => {
      expect(container.querySelector('[role="group"]')?.getAttribute('aria-labelledby')).toBeTruthy();
      expect(container.textContent).toContain('Revenue');
      expect(container.querySelector('svg > title')).toBeNull();
    });
  });

  it('shows an HTML tip for a bar', async () => {
    const { container } = render(<VizzyChart config={config} data={data} showPerformanceMetrics={false} />);
    const bar = await waitFor(() => {
      const node = container.querySelector('rect.bar');
      expect(node).toBeTruthy();
      return node as SVGRectElement;
    });
    bar.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 24, bubbles: true }));
    const tip = container.querySelector('.vizzy-tip');
    expect(tip?.textContent).toMatch(/Jan/);
    expect((tip as HTMLDivElement).hidden).toBe(false);
  });
});
