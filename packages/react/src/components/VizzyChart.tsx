import React, { forwardRef, useImperativeHandle } from 'react';
import { ChartConfig, DataPoint, VizzyError } from '@vizzy/core';
import type { PerformanceMetrics } from '@vizzy/core';
import { useVizzyChart } from '../hooks/useVizzyChart';

export interface VizzyChartProps {
  /** Chart configuration object */
  config: ChartConfig;
  /** Data array for the chart */
  data: DataPoint[];
  /** Optional CSS class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Loading component to show while chart is rendering */
  loadingComponent?: React.ReactNode;
  /** Error component to show when chart fails to render */
  errorComponent?: React.ComponentType<{ error: VizzyError }>;
  /** Callback fired when chart rendering is complete */
  onRenderComplete?: (metrics: PerformanceMetrics) => void;
  /** Callback fired when chart update is complete */
  onUpdateComplete?: (metrics: PerformanceMetrics) => void;
  /** Callback fired when an error occurs */
  onError?: (error: VizzyError) => void;
  /** Whether to show performance metrics in development */
  showPerformanceMetrics?: boolean;
}

export interface VizzyChartRef {
  /** Update chart data */
  updateData: (newData: DataPoint[]) => Promise<void>;
  /** Update chart configuration */
  updateConfig: (newConfig: Partial<ChartConfig>) => Promise<void>;
  /** Manually trigger chart resize */
  resize: () => Promise<void>;
  /** Get current performance metrics */
  getPerformance: () => PerformanceMetrics | null;
  /** Get chart instance (for advanced usage) */
  getChartInstance: () => unknown;
}

const DefaultLoadingComponent: React.FC = () => (
  <div 
    className="vizzy-loading"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      color: '#6b7280',
      fontSize: '14px',
    }}
  >
    Loading chart...
  </div>
);

const DefaultErrorComponent: React.FC<{ error: VizzyError }> = ({ error }) => (
  <div 
    className="vizzy-error"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '20px',
      color: '#ef4444',
      fontSize: '14px',
      textAlign: 'center',
    }}
  >
    <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
      Chart Error
    </div>
    <div style={{ fontSize: '12px', opacity: 0.8 }}>
      {error.message}
    </div>
    {error.recoverable && (
      <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.6 }}>
        This error may be recoverable. Please check your data and configuration.
      </div>
    )}
  </div>
);

const PerformanceMetricsComponent: React.FC<{ metrics: PerformanceMetrics }> = ({ metrics }) => (
  <div 
    className="vizzy-performance-metrics"
    style={{
      position: 'absolute',
      top: '4px',
      right: '4px',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '10px',
      fontFamily: 'monospace',
      pointerEvents: 'none',
      zIndex: 1000,
    }}
  >
    <div>Render: {metrics.renderTime.toFixed(1)}ms</div>
    <div>FPS: {metrics.frameRate.toFixed(0)}</div>
    <div>Points: {metrics.dataPointsRendered}</div>
    {metrics.memoryUsage > 0 && (
      <div>Memory: {metrics.memoryUsage.toFixed(1)}MB</div>
    )}
  </div>
);

export const VizzyChart = forwardRef<VizzyChartRef, VizzyChartProps>(({
  config,
  data,
  className,
  style,
  loadingComponent = <DefaultLoadingComponent />,
  errorComponent: ErrorComponent = DefaultErrorComponent,
  onRenderComplete,
  onUpdateComplete,
  onError,
  showPerformanceMetrics = process.env.NODE_ENV === 'development',
}, ref) => {
  const {
    containerRef,
    chartInstance,
    isLoading,
    error,
    performance,
    updateData,
    updateConfig,
    resize,
  } = useVizzyChart({
    config,
    data,
    ...(onError && { onError }),
    ...(onRenderComplete && { onRenderComplete }),
    ...(onUpdateComplete && { onUpdateComplete }),
  });

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    updateData,
    updateConfig,
    resize,
    getPerformance: () => performance,
    getChartInstance: () => chartInstance,
  }), [updateData, updateConfig, resize, performance, chartInstance]);

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    ...style,
  };

  return (
    <div
      className={`vizzy-chart-container ${className || ''}`}
      style={containerStyle}
      role="img"
      aria-label={config.accessibility?.title || 'Data visualization chart'}
      aria-describedby={config.accessibility?.description ? 'vizzy-chart-description' : undefined}
      tabIndex={config.accessibility?.keyboardNavigation ? 0 : undefined}
    >
      {config.accessibility?.description && (
        <div
          id="vizzy-chart-description"
          style={{ position: 'absolute', left: '-10000px' }}
        >
          {config.accessibility.description}
        </div>
      )}

      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {isLoading && loadingComponent}

      {error && <ErrorComponent error={error} />}

      {showPerformanceMetrics && performance && !isLoading && !error && (
        <PerformanceMetricsComponent metrics={performance} />
      )}
    </div>
  );
});

VizzyChart.displayName = 'VizzyChart';
