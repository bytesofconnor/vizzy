import { useEffect, useRef, useCallback, useState } from 'react';
import { VizzyChartEngine, ChartConfig, DataPoint, PerformanceMetrics, VizzyError } from '@vizzy/core';

export interface UseVizzyChartOptions {
  config: ChartConfig;
  data: DataPoint[];
  onError?: (error: VizzyError) => void;
  onRenderComplete?: (metrics: PerformanceMetrics) => void;
  onUpdateComplete?: (metrics: PerformanceMetrics) => void;
}

export interface UseVizzyChartReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  chartInstance: VizzyChartEngine | null;
  isLoading: boolean;
  error: VizzyError | null;
  performance: PerformanceMetrics | null;
  updateData: (newData: DataPoint[]) => Promise<void>;
  updateConfig: (newConfig: Partial<ChartConfig>) => Promise<void>;
  resize: () => Promise<void>;
}

export function useVizzyChart({
  config,
  data,
  onError,
  onRenderComplete,
  onUpdateComplete,
}: UseVizzyChartOptions): UseVizzyChartReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<VizzyChartEngine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<VizzyError | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const initChart = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setError(null);

        // Clean up existing chart
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy();
        }

        // Create new chart instance
        const chartInstance = new VizzyChartEngine(
          containerRef.current as HTMLDivElement,
          config,
          data
        );

        // Set up event listeners
        chartInstance.on('render:complete', (_eventData: unknown) => {
          setPerformance(chartInstance.performance);
          onRenderComplete?.(chartInstance.performance);
        });

        chartInstance.on('update:complete', (_eventData: unknown) => {
          setPerformance(chartInstance.performance);
          onUpdateComplete?.(chartInstance.performance);
        });

        chartInstance.on('render:error', (eventError: unknown) => {
          const vizzyError = eventError instanceof VizzyError 
            ? eventError 
            : new VizzyError('RENDER_ERROR', 'Chart render failed', { originalError: eventError });
          
          setError(vizzyError);
          onError?.(vizzyError);
        });

        chartInstance.on('update:error', (eventError: unknown) => {
          const vizzyError = eventError instanceof VizzyError 
            ? eventError 
            : new VizzyError('UPDATE_ERROR', 'Chart update failed', { originalError: eventError });
          
          setError(vizzyError);
          onError?.(vizzyError);
        });

        // Render the chart
        await chartInstance.render();

        chartInstanceRef.current = chartInstance;
        setIsLoading(false);

      } catch (err) {
        const vizzyError = err instanceof VizzyError 
          ? err 
          : new VizzyError('INITIALIZATION_ERROR', 'Chart initialization failed', { originalError: err });
        
        setError(vizzyError);
        setIsLoading(false);
        onError?.(vizzyError);
      }
    };

    initChart();

    // Cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [config, data, onError, onRenderComplete, onUpdateComplete]);

  // Update data function
  const updateData = useCallback(async (newData: DataPoint[]): Promise<void> => {
    if (!chartInstanceRef.current) {
      throw new VizzyError('CHART_NOT_INITIALIZED', 'Chart must be initialized before updating data');
    }

    try {
      setIsLoading(true);
      setError(null);
      await chartInstanceRef.current.update(newData);
      setIsLoading(false);
    } catch (err) {
      const vizzyError = err instanceof VizzyError 
        ? err 
        : new VizzyError('UPDATE_DATA_ERROR', 'Failed to update chart data', { originalError: err });
      
      setError(vizzyError);
      setIsLoading(false);
      onError?.(vizzyError);
      throw vizzyError;
    }
  }, [onError]);

  // Update config function
  const updateConfig = useCallback(async (newConfig: Partial<ChartConfig>): Promise<void> => {
    if (!chartInstanceRef.current || !containerRef.current) {
      throw new VizzyError('CHART_NOT_INITIALIZED', 'Chart must be initialized before updating config');
    }

    try {
      setIsLoading(true);
      setError(null);

      // Merge new config with existing config
      const mergedConfig = { ...config, ...newConfig };
      const currentData = chartInstanceRef.current.data;
      chartInstanceRef.current.destroy();

      const newChartInstance = new VizzyChartEngine(
        containerRef.current,
        mergedConfig,
        currentData
      );

      await newChartInstance.render();
      chartInstanceRef.current = newChartInstance;
      setIsLoading(false);

    } catch (err) {
      const vizzyError = err instanceof VizzyError 
        ? err 
        : new VizzyError('UPDATE_CONFIG_ERROR', 'Failed to update chart config', { originalError: err });
      
      setError(vizzyError);
      setIsLoading(false);
      onError?.(vizzyError);
      throw vizzyError;
    }
  }, [config, onError]);

  // Resize function
  const resize = useCallback(async (): Promise<void> => {
    if (!chartInstanceRef.current) {
      throw new VizzyError('CHART_NOT_INITIALIZED', 'Chart must be initialized before resizing');
    }

    try {
      await chartInstanceRef.current.resize();
    } catch (err) {
      const vizzyError = err instanceof VizzyError 
        ? err 
        : new VizzyError('RESIZE_ERROR', 'Failed to resize chart', { originalError: err });
      
      setError(vizzyError);
      onError?.(vizzyError);
      throw vizzyError;
    }
  }, [onError]);

  return {
    containerRef,
    chartInstance: chartInstanceRef.current,
    isLoading,
    error,
    performance,
    updateData,
    updateConfig,
    resize,
  };
}

