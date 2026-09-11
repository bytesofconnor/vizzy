import { useState, useCallback, useMemo } from 'react';
import { ChartConfig, validateChartConfig, VizzyError } from '@vizzy/core';

export interface UseChartConfigOptions {
  initialConfig?: Partial<ChartConfig>;
  validateOnChange?: boolean;
}

export interface UseChartConfigReturn {
  config: ChartConfig | null;
  isValid: boolean;
  validationError: VizzyError | null;
  setConfig: (newConfig: Partial<ChartConfig>) => void;
  updateConfig: (updates: Partial<ChartConfig>) => void;
  resetConfig: () => void;
  validateConfig: () => boolean;
  getConfigPreset: (presetName: string) => Partial<ChartConfig>;
  applyPreset: (presetName: string) => void;
}

// Predefined configuration presets
const CONFIG_PRESETS: Record<string, Partial<ChartConfig>> = {
  minimal: {
    dimensions: {
      width: 'responsive',
      height: 300,
      margin: { top: 10, right: 10, bottom: 30, left: 40 },
    },
    colors: {
      primary: '#3b82f6',
      palette: ['#3b82f6', '#ef4444', '#10b981'],
    },
    animation: {
      enabled: false,
    },
    legend: {
      show: false,
    },
  },
  
  standard: {
    dimensions: {
      width: 'responsive',
      height: 400,
      margin: { top: 20, right: 20, bottom: 40, left: 50 },
    },
    colors: {
      primary: '#3b82f6',
      palette: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'],
    },
    animation: {
      enabled: true,
      duration: 750,
    },
    legend: {
      show: true,
      position: 'right',
    },
  },
  
  presentation: {
    dimensions: {
      width: 'responsive',
      height: 500,
      margin: { top: 30, right: 30, bottom: 60, left: 70 },
    },
    colors: {
      primary: '#1f2937',
      palette: [
        '#1f2937', '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
        '#8b5cf6', '#06b6d4', '#84cc16', '#f97316', '#ec4899'
      ],
    },
    animation: {
      enabled: true,
      duration: 1000,
      easing: 'ease-out',
    },
    legend: {
      show: true,
      position: 'bottom',
      orientation: 'horizontal',
    },
    axes: {
      x: {
        show: true,
        grid: true,
        label: 'X Axis',
      },
      y: {
        show: true,
        grid: true,
        label: 'Y Axis',
      },
    },
  },
  
  dashboard: {
    dimensions: {
      width: 'responsive',
      height: 250,
      margin: { top: 15, right: 15, bottom: 25, left: 35 },
    },
    colors: {
      primary: '#6366f1',
      palette: ['#6366f1', '#ec4899', '#06b6d4', '#84cc16'],
    },
    animation: {
      enabled: true,
      duration: 500,
    },
    legend: {
      show: false,
    },
    axes: {
      x: {
        show: true,
        grid: false,
      },
      y: {
        show: true,
        grid: true,
        gridOpacity: 0.05,
      },
    },
  },
  
  mobile: {
    dimensions: {
      width: 'responsive',
      height: 200,
      margin: { top: 10, right: 10, bottom: 20, left: 25 },
    },
    colors: {
      primary: '#3b82f6',
      palette: ['#3b82f6', '#ef4444', '#10b981'],
    },
    animation: {
      enabled: false, // Disable for better mobile performance
    },
    legend: {
      show: false,
    },
    axes: {
      x: {
        show: true,
        grid: false,
        tickCount: 3,
      },
      y: {
        show: true,
        grid: true,
        tickCount: 3,
        gridOpacity: 0.1,
      },
    },
  },
};

export function useChartConfig({
  initialConfig = {},
  validateOnChange = true,
}: UseChartConfigOptions = {}): UseChartConfigReturn {
  const [configState, setConfigState] = useState<Partial<ChartConfig>>(initialConfig);
  const [validationError, setValidationError] = useState<VizzyError | null>(null);

  // Validate and get complete config
  const { config, isValid } = useMemo(() => {
    try {
      const validatedConfig = validateChartConfig(configState);
      setValidationError(null);
      return { config: validatedConfig, isValid: true };
    } catch (error) {
      const vizzyError = error instanceof VizzyError 
        ? error 
        : new VizzyError('CONFIG_VALIDATION_ERROR', 'Configuration validation failed', { error });
      
      if (validateOnChange) {
        setValidationError(vizzyError);
      }
      
      return { config: null, isValid: false };
    }
  }, [configState, validateOnChange]);

  // Set complete config
  const setConfig = useCallback((newConfig: Partial<ChartConfig>): void => {
    setConfigState(newConfig);
  }, []);

  // Update specific config properties
  const updateConfig = useCallback((updates: Partial<ChartConfig>): void => {
    setConfigState(prevConfig => ({
      ...prevConfig,
      ...updates,
    }));
  }, []);

  // Reset to initial config
  const resetConfig = useCallback((): void => {
    setConfigState(initialConfig);
    setValidationError(null);
  }, [initialConfig]);

  // Manually validate config
  const validateConfig = useCallback((): boolean => {
    try {
      validateChartConfig(configState);
      setValidationError(null);
      return true;
    } catch (error) {
      const vizzyError = error instanceof VizzyError 
        ? error 
        : new VizzyError('CONFIG_VALIDATION_ERROR', 'Configuration validation failed', { error });
      
      setValidationError(vizzyError);
      return false;
    }
  }, [configState]);

  // Get preset configuration
  const getConfigPreset = useCallback((presetName: string): Partial<ChartConfig> => {
    const preset = CONFIG_PRESETS[presetName];
    if (!preset) {
      throw new Error(`Unknown preset: ${presetName}. Available presets: ${Object.keys(CONFIG_PRESETS).join(', ')}`);
    }
    return preset;
  }, []);

  // Apply preset configuration
  const applyPreset = useCallback((presetName: string): void => {
    const preset = getConfigPreset(presetName);
    setConfig({ ...configState, ...preset });
  }, [configState, getConfigPreset, setConfig]);

  return {
    config,
    isValid,
    validationError,
    setConfig,
    updateConfig,
    resetConfig,
    validateConfig,
    getConfigPreset,
    applyPreset,
  };
}

