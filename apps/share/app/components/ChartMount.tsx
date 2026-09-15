'use client';

import { useMemo } from 'react';
import { VizzyChart } from '@vizzy/react';
import { validateChartConfig, xAxisRoom, type ChartConfig, type DataPoint } from '@vizzy/core';

export function ChartMount({
  config,
  data,
}: {
  config: ChartConfig;
  data: DataPoint[];
}) {
  const live = useMemo(() => {
    const xLabel = config.axes?.x?.label;
    const yLabel = config.axes?.y?.label;
    const names = data.map((row) => String(row[config.dataMapping.x] ?? ''));
    const bar = config.chart?.type === 'bar';
    const bottom = bar
      ? xAxisRoom(names, { hasTitle: Boolean(xLabel), innerWidth: 720 }).bottom
      : xLabel
        ? 58
        : 36;
    return validateChartConfig({
      ...config,
      dimensions: {
        ...config.dimensions,
        width: 'responsive',
        margin: {
          top: 28,
          right: 20,
          bottom,
          left: yLabel ? 64 : 28,
        },
      },
    });
  }, [config, data]);

  return (
    <VizzyChart
      className="chart-mount"
      config={live}
      data={data}
      showPerformanceMetrics={false}
      style={{ width: '100%', height: 'auto' }}
    />
  );
}
