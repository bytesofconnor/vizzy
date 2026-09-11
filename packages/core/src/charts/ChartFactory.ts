import { ChartConfig, DataPoint, VizzyError } from '../types';
import { RenderContext } from '../components/RenderEngine';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { ScatterPlot } from './ScatterPlot';

export interface ChartRenderer<TData extends DataPoint = DataPoint> {
  render(context: RenderContext, data: TData[]): Promise<void>;
}

export class ChartFactory {
  public static createChart<TData extends DataPoint = DataPoint>(
    config: ChartConfig
  ): ChartRenderer<TData> {
    switch (config.chart.type) {
      case 'bar':
        return new BarChart<TData>(config) as ChartRenderer<TData>;
      
      case 'line':
        return new LineChart<TData>(config) as ChartRenderer<TData>;
      
      case 'scatter':
        return new ScatterPlot<TData>(config) as ChartRenderer<TData>;
      
      default: {
        const requestedType = (config.chart as { type?: string }).type;
        throw new VizzyError(
          'UNSUPPORTED_CHART_TYPE',
          `Chart type '${requestedType ?? 'unknown'}' is not supported`,
          {
            supportedTypes: ['bar', 'line', 'scatter'],
            requestedType,
          },
          false
        );
      }
    }
  }

  public static getSupportedChartTypes(): string[] {
    return ['bar', 'line', 'scatter'];
  }

  public static isChartTypeSupported(chartType: string): boolean {
    return this.getSupportedChartTypes().includes(chartType);
  }
}

