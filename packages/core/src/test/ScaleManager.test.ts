import { describe, it, expect, beforeEach } from 'vitest';
import { ScaleManager } from '../components/ScaleManager';
import { ChartConfig } from '../types';

describe('ScaleManager', () => {
  let scaleManager: ScaleManager;
  let config: ChartConfig;

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
        ariaLabel: 'Test Chart',
        ariaDescription: 'A test chart for unit testing',
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

    const dimensions = {
      width: 800,
      height: 600,
      innerWidth: 720, // width - left margin - right margin
      innerHeight: 540, // height - top margin - bottom margin
    };

    scaleManager = new ScaleManager(config, dimensions);
  });

  describe('createScales', () => {
    it('should create scales for categorical x and numeric y', () => {
      const domains = {
        x: ['A', 'B', 'C', 'D'],
        y: [0, 30],
      };

      const scales = scaleManager.createScales(domains);

      expect(scales.x).toBeDefined();
      expect(scales.y).toBeDefined();
      expect(scales.x?.domain()).toEqual(['A', 'B', 'C', 'D']);
      expect(scales.y?.domain()).toEqual([0, 30]);
    });

    it('should create scales for numeric x and y', () => {
      const domains = {
        x: [0, 100],
        y: [0, 50],
      };

      const scales = scaleManager.createScales(domains);

      expect(scales.x).toBeDefined();
      expect(scales.y).toBeDefined();
      expect(scales.x?.domain()).toEqual([0, 100]);
      expect(scales.y?.domain()).toEqual([0, 50]);
    });

    it('should create color scale when color domain provided', () => {
      const domains = {
        x: ['A', 'B', 'C'],
        y: [0, 30],
        color: ['red', 'green', 'blue'],
      };

      const scales = scaleManager.createScales(domains);

      expect(scales.color).toBeDefined();
      expect(scales.color?.domain()).toEqual(['red', 'green', 'blue']);
    });

    it('should create size scale when size domain provided', () => {
      const domains = {
        x: ['A', 'B', 'C'],
        y: [0, 30],
        size: [1, 10],
      };

      const scales = scaleManager.createScales(domains);

      expect(scales.size).toBeDefined();
      expect(scales.size?.domain()).toEqual([1, 10]);
    });
  });

  describe('updateDimensions', () => {
    it('should update scales with new dimensions', () => {
      const domains = {
        x: ['A', 'B', 'C'],
        y: [0, 30],
      };

      scaleManager.createScales(domains);
      
      const newDimensions = {
        width: 1000,
        height: 800,
        innerWidth: 920,
        innerHeight: 740,
      };

      scaleManager.updateDimensions(newDimensions);

      const scales = scaleManager.getScales();
      expect(scales).toBeDefined();
    });
  });

  describe('getScales', () => {
    it('should return current scales', () => {
      const domains = {
        x: ['A', 'B', 'C'],
        y: [0, 30],
      };

      scaleManager.createScales(domains);
      const scales = scaleManager.getScales();

      expect(scales).toBeDefined();
      expect(scales.x).toBeDefined();
      expect(scales.y).toBeDefined();
    });

    it('should return null if scales not created', () => {
      const scales = scaleManager.getScales();
      expect(scales).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty domains', () => {
      const domains = {
        x: [],
        y: [0, 0],
      };

      const scales = scaleManager.createScales(domains);

      expect(scales.x).toBeDefined();
      expect(scales.y).toBeDefined();
    });

    it('should handle single value domains', () => {
      const domains = {
        x: ['A'],
        y: [10, 10],
      };

      const scales = scaleManager.createScales(domains);

      expect(scales.x).toBeDefined();
      expect(scales.y).toBeDefined();
    });

    it('should handle negative values', () => {
      const domains = {
        x: [-10, 10],
        y: [-5, 5],
      };

      const scales = scaleManager.createScales(domains);

      expect(scales.x?.domain()).toEqual([-10, 10]);
      expect(scales.y?.domain()).toEqual([-5, 5]);
    });
  });
});

