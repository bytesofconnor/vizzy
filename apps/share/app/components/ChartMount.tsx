'use client';

import { useMemo } from 'react';
import { VizzyChart } from '@vizzy/react';
import { validateChartConfig, xAxisRoom, type ChartConfig, type DataPoint } from '@vizzy/core';

export function ChartMount({
  config,
  data,
  label,
  framed = false,
}: {
  config: ChartConfig;
  data: DataPoint[];
  label?: string;
  framed?: boolean;
}) {
  const live = useMemo(() => {
    const xLabel = config.axes?.x?.label;
    const yLabel = config.axes?.y?.label;
    const names = [
      ...new Set(data.map((row) => String(row[config.dataMapping.x] ?? ''))),
    ];
    const bar = config.chart?.type === 'bar';
    const narrowInner = 340;
    const wideInner = 720;
    const room = xAxisRoom(names, {
      hasTitle: Boolean(xLabel),
      innerWidth: bar ? wideInner : narrowInner,
    });
    const bottom = Math.max(bar ? room.bottom : xLabel ? 48 : 32, room.bottom);
    const title = config.accessibility?.title || label;
    const legendTop = config.legend?.show && config.legend.position === 'top';
    const motion =
      typeof window !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const baseMargin = config.dimensions?.margin ?? {};
    return validateChartConfig({
      ...config,
      colors: {
        ...config.colors,
        grid: config.colors?.grid ?? '#c5c2b9',
      },
      dimensions: {
        ...config.dimensions,
        width: 'responsive',
        margin: {
          top: legendTop ? Math.max(Number(baseMargin.top ?? 0), 44) : 28,
          right: Math.max(Number(baseMargin.right ?? 0), 32),
          bottom,
          left: yLabel ? Math.max(Number(baseMargin.left ?? 0), 64) : 28,
        },
      },
      axes: {
        x: { ...config.axes?.x, show: config.axes?.x?.show ?? true, grid: false },
        y: {
          ...config.axes?.y,
          show: config.axes?.y?.show ?? true,
          grid: true,
          gridOpacity: config.axes?.y?.gridOpacity ?? 0.55,
          tickCount: config.axes?.y?.tickCount ?? 5,
        },
      },
      animation: {
        enabled: motion,
        duration: 280,
        easing: 'ease-out',
        stagger: 32,
      },
      accessibility: {
        ...config.accessibility,
        enabled: true,
        ...(title ? { title } : {}),
      },
    });
  }, [config, data, label]);

  return (
    <VizzyChart
      className={framed ? 'chart-mount is-framed' : 'chart-mount'}
      config={live}
      data={data}
      showPerformanceMetrics={false}
      style={{ width: '100%', height: 'auto' }}
    />
  );
}
