import { describe, it, expect, beforeEach } from 'vitest';
import { DataProcessor } from '../components/DataProcessor';
import { ChartConfig, DataPoint } from '../types';

describe('DataProcessor', () => {
  let processor: DataProcessor;
  let config: ChartConfig;
  let sampleData: DataPoint[];

  beforeEach(() => {
    config = {
      chart: {
        type: 'bar',
        orientation: 'vertical',
        grouping: 'single',
        barPadding: 0.1,
        groupPadding: 0.05,
        cornerRadius: 0,
      },
      dataMapping: {
        x: 'category',
        y: 'value',
      },
      dimensions: {
        width: 800,
        height: 600,
        margin: { top: 20, right: 20, bottom: 40, left: 40 },
      },
      colors: {
        primary: '#3b82f6',
        secondary: '#ef4444',
        accent: '#10b981',
        background: '#ffffff',
        text: '#1f2937',
        grid: '#e5e7eb',
        palette: [
          '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
          '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
        ],
      },
      animation: {
        enabled: true,
        duration: 750,
        easing: 'ease-out',
        stagger: 50,
      },
      interaction: {
        hover: true,
        click: false,
        zoom: false,
        brush: false,
        tooltip: true,
      },
      accessibility: {
        enabled: true,
        title: 'Test Chart',
        description: 'A test chart for unit testing',
        keyboardNavigation: true,
        screenReaderSupport: true,
        highContrast: false,
      },
      performance: {
        renderStrategy: 'svg',
        enableVirtualization: false,
        maxDataPoints: 10000,
        debounceResize: 250,
        enableWebGL: false,
      },
      axes: {
        x: {},
        y: {},
      },
      legend: {
        show: true,
        position: 'right',
        orientation: 'vertical',
        itemSpacing: 10,
        symbolSize: 12,
      },
    };

    sampleData = [
      { category: 'A', value: 10 },
      { category: 'B', value: 20 },
      { category: 'C', value: 15 },
      { category: 'D', value: 25 },
    ];

    processor = new DataProcessor(config);
  });

  describe('process', () => {
    it('should process valid data correctly', () => {
      const result = processor.process(sampleData);

      expect(result.processed).toHaveLength(4);
      expect(result.statistics).toBeDefined();
      expect(result.domains).toBeDefined();
    });

    it('should handle empty data array', () => {
      // Empty arrays are allowed by the schema validation
      const result = processor.process([]);
      expect(result.processed).toHaveLength(0);
      expect(result.statistics.count).toBe(0);
    });

    it('should handle missing required fields', () => {
      const invalidData = [
        { category: 'A' }, // missing value
        { value: 10 }, // missing category
      ];

      expect(() => processor.process(invalidData)).toThrow();
    });

    it('should handle null and undefined values', () => {
      const dataWithNulls = [
        { category: 'A', value: 10 },
        { category: 'B', value: null },
        { category: 'C', value: undefined },
        { category: 'D', value: 20 },
      ];

      const result = processor.process(dataWithNulls);

      expect(result.processed).toHaveLength(2); // Only valid entries
    });

    it('should calculate correct statistics', () => {
      const result = processor.process(sampleData);

      expect(result.statistics.xStats).toBeNull(); // categorical
      expect(result.statistics.yStats).toBeDefined();
      expect(result.statistics.yStats?.min).toBe(10);
      expect(result.statistics.yStats?.max).toBe(25);
      expect(result.statistics.yStats?.mean).toBe(17.5);
    });

    it('should calculate correct domains', () => {
      const result = processor.process(sampleData);

      expect(result.domains.x).toEqual(['A', 'B', 'C', 'D']);
      expect(result.domains.y).toEqual([0, 25.75]);
    });
  });

  describe('getProcessedData', () => {
    it('should return processed data after processing', () => {
      processor.process(sampleData);
      const result = processor.getProcessedData();

      expect(result).toBeDefined();
      expect(result?.processed).toHaveLength(4);
    });

    it('should return null before processing', () => {
      const result = processor.getProcessedData();
      expect(result).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle very large datasets', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        category: `Category${i}`,
        value: Math.random() * 100,
      }));

      const result = processor.process(largeData);

      expect(result.processed).toHaveLength(10000);
    });

    it('should handle single data point', () => {
      const singleData = [{ category: 'A', value: 10 }];

      const result = processor.process(singleData);

      expect(result.processed).toHaveLength(1);
    });

    it('should handle mixed data types gracefully', () => {
      const mixedData = [
        { category: 'A', value: 10 },
        { category: 'B', value: '20' }, // string number
        { category: 'C', value: 15 },
      ];

      const result = processor.process(mixedData);

      expect(result.processed).toHaveLength(3);
    });
  });
});

