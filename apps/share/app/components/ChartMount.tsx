'use client';

import { useEffect, useMemo, useState } from 'react';
import { VizzyChart } from '@vizzy/react';
import { validateChartConfig, xAxisRoom, type ChartConfig, type DataPoint } from '@vizzy/core';

const LAYOUT_INNER_WIDTH = 560;

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
  const [motion, setMotion] = useState(false);

  useEffect(() => {
    setMotion(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const live = useMemo(() => {
    const xLabel = config.axes?.x?.label;
    const yLabel = config.axes?.y?.label;
    const names = [
      ...new Set(data.map((row) => String(row[config.dataMapping.x] ?? ''))),
    ];
    const room = xAxisRoom(names, {
      hasTitle: Boolean(xLabel),
      innerWidth: LAYOUT_INNER_WIDTH,
    });
    const bottom = Math.min(Math.max(room.bottom, xLabel ? 48 : 32), 120);
    const title = config.accessibility?.title || label;
    const legendTop = config.legend?.show && config.legend.position === 'top';
    const baseMargin = config.dimensions?.margin ?? {};
    const next = validateChartConfig({
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
      interaction: {
        ...config.interaction,
        hover: true,
        tooltip: true,
      },
      accessibility: {
        ...config.accessibility,
        enabled: true,
        ...(title ? { title } : {}),
      },
    });
    return { config: next, minHeight: Math.min(168 + bottom, 280) };
  }, [config, data, label, motion]);

  return (
    <VizzyChart
      className={framed ? 'chart-mount is-framed' : 'chart-mount'}
      config={live.config}
      data={data}
      showPerformanceMetrics={false}
      style={{ width: '100%', height: 'auto', minHeight: live.minHeight }}
    />
  );
}
