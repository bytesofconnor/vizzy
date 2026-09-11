export class EventEmitter {
  private _listeners: Map<string, Set<(data: unknown) => void>> = new Map();

  public on(event: string, handler: (data: unknown) => void): void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    const listeners = this._listeners.get(event);
    if (listeners) {
      listeners.add(handler);
    }
  }

  public off(event: string, handler?: (data: unknown) => void): void {
    const listeners = this._listeners.get(event);
    if (!listeners) return;

    if (handler) {
      listeners.delete(handler);
      if (listeners.size === 0) {
        this._listeners.delete(event);
      }
    } else {
      this._listeners.delete(event);
    }
  }

  public emit(event: string, data?: unknown): void {
    const listeners = this._listeners.get(event);
    if (!listeners) return;

    // Create a copy to avoid issues if listeners are modified during emission
    const listenersArray = Array.from(listeners);
    
    for (const listener of listenersArray) {
      try {
        listener(data);
      } catch (_error) {
        // console.error(`Error in event listener for '${event}':`, error);
      }
    }
  }

  public removeAllListeners(): void {
    this._listeners.clear();
  }

  public listenerCount(event: string): number {
    return this._listeners.get(event)?.size ?? 0;
  }

  public eventNames(): string[] {
    return Array.from(this._listeners.keys());
  }
}

