import { PerformanceMetrics } from '../types';

export class PerformanceMonitor {
  private _metrics: PerformanceMetrics = {
    renderTime: 0,
    updateTime: 0,
    memoryUsage: 0,
    frameRate: 0,
    dataPointsRendered: 0,
  };

  private _renderTimes: number[] = [];
  private _updateTimes: number[] = [];

  public recordRenderTime(time: number): void {
    this._renderTimes.push(time);
    if (this._renderTimes.length > 10) {
      this._renderTimes.shift();
    }
    this._metrics.renderTime = this._average(this._renderTimes);
  }

  public recordUpdateTime(time: number): void {
    this._updateTimes.push(time);
    if (this._updateTimes.length > 10) {
      this._updateTimes.shift();
    }
    this._metrics.updateTime = this._average(this._updateTimes);
  }

  public recordDataPoints(count: number): void {
    this._metrics.dataPointsRendered = count;
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this._metrics };
  }

  public reset(): void {
    this._renderTimes = [];
    this._updateTimes = [];
    this._metrics = {
      renderTime: 0,
      updateTime: 0,
      memoryUsage: 0,
      frameRate: 0,
      dataPointsRendered: 0,
    };
  }

  private _average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }
}
