'use client';

import { useMemo } from 'react';
import { VizzyChart } from '@vizzy/react';
import { validateChartConfig, type ChartConfig, type DataPoint } from '@vizzy/core';

export function ChartMount({
  config,
  data,
}: {
  config: ChartConfig;
  data: DataPoint[];
}) {
  const live = useMemo(
    () =>
      validateChartConfig({
        ...config,
        dimensions: {
          ...config.dimensions,
          width: 'responsive',
          margin: { top: 28, right: 12, bottom: 36, left: 28 },
        },
      }),
    [config]
  );

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
