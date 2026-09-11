import { useState, useCallback, useMemo } from 'react';
import { DataPoint, DataProcessor, ProcessedData } from '@vizzy/core';

export interface UseChartDataOptions {
  initialData?: DataPoint[];
  autoProcess?: boolean;
}

export interface UseChartDataReturn {
  data: DataPoint[];
  processedData: ProcessedData | null;
  isProcessing: boolean;
  error: Error | null;
  setData: (newData: DataPoint[]) => void;
  addData: (newPoints: DataPoint[]) => void;
  removeData: (predicate: (point: DataPoint) => boolean) => void;
  updateData: (index: number, newPoint: DataPoint) => void;
  clearData: () => void;
  processData: (config: unknown) => Promise<ProcessedData>;
  filterData: (predicate: (point: DataPoint) => boolean) => DataPoint[];
  sortData: (compareFn: (a: DataPoint, b: DataPoint) => number) => DataPoint[];
  getDataStats: () => {
    count: number;
    fields: string[];
    types: Record<string, string>;
  };
}

export function useChartData({
  initialData = [],
  autoProcess: _autoProcess = false,
}: UseChartDataOptions = {}): UseChartDataReturn {
  const [data, setDataState] = useState<DataPoint[]>(initialData);
  const [processedData, setProcessedData] = useState<ProcessedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Set data with validation
  const setData = useCallback((newData: DataPoint[]): void => {
    try {
      setError(null);
      
      if (!Array.isArray(newData)) {
        throw new Error('Data must be an array');
      }

      // Validate data structure
      if (newData.length > 0) {
        const firstItem = newData[0];
        if (typeof firstItem !== 'object' || firstItem === null) {
          throw new Error('Data items must be objects');
        }
      }

      setDataState(newData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error setting data'));
    }
  }, []);

  // Add data points
  const addData = useCallback((newPoints: DataPoint[]): void => {
    setDataState((prevData: DataPoint[]) => [...prevData, ...newPoints]);
  }, []);

  // Remove data points based on predicate
  const removeData = useCallback((predicate: (point: DataPoint) => boolean): void => {
    setDataState(prevData => prevData.filter(point => !predicate(point)));
  }, []);

  // Update specific data point
  const updateData = useCallback((index: number, newPoint: DataPoint): void => {
    setDataState(prevData => {
      if (index < 0 || index >= prevData.length) {
        throw new Error(`Index ${index} is out of bounds`);
      }
      
      const newData = [...prevData];
      newData[index] = newPoint;
      return newData;
    });
  }, []);

  // Clear all data
  const clearData = useCallback((): void => {
    setDataState([]);
    setProcessedData(null);
    setError(null);
  }, []);

  // Process data with configuration
  const processData = useCallback(async (config: unknown): Promise<ProcessedData> => {
    try {
      setIsProcessing(true);
      setError(null);

      const processor = new DataProcessor(config);
      const result = await processor.process(data);
      
      setProcessedData(result);
      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Data processing failed');
      setError(error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [data]);

  // Filter data
  const filterData = useCallback((predicate: (point: DataPoint) => boolean): DataPoint[] => {
    return data.filter(predicate);
  }, [data]);

  // Sort data
  const sortData = useCallback((compareFn: (a: DataPoint, b: DataPoint) => number): DataPoint[] => {
    return [...data].sort(compareFn);
  }, [data]);

  // Get data statistics
  const getDataStats = useMemo(() => {
    return () => {
      if (data.length === 0) {
        return {
          count: 0,
          fields: [],
          types: {},
        };
      }

      const firstItem = data[0];
      const fields = Object.keys(firstItem);
      const types: Record<string, string> = {};

      // Determine field types based on first non-null value
      for (const field of fields) {
        for (const item of data) {
          const value = item[field];
          if (value !== null && value !== undefined) {
            if (typeof value === 'number') {
              types[field] = 'number';
            } else if (value instanceof Date) {
              types[field] = 'date';
            } else if (typeof value === 'boolean') {
              types[field] = 'boolean';
            } else {
              types[field] = 'string';
            }
            break;
          }
        }
        
        // Default to string if no non-null value found
        if (!types[field]) {
          types[field] = 'string';
        }
      }

      return {
        count: data.length,
        fields,
        types,
      };
    };
  }, [data]);

  return {
    data,
    processedData,
    isProcessing,
    error,
    setData,
    addData,
    removeData,
    updateData,
    clearData,
    processData,
    filterData,
    sortData,
    getDataStats,
  };
}
