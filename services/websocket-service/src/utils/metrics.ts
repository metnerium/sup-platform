import logger from './logger';

/**
 * Metrics collector for WebSocket service
 * Tracks connections, events, and performance metrics
 */
class MetricsCollector {
  private metrics: {
    connections: {
      total: number;
      active: number;
      peak: number;
    };
    events: Map<string, {
      count: number;
      errors: number;
      totalLatency: number;
    }>;
    errors: {
      total: number;
      byType: Map<string, number>;
    };
    startTime: number;
  };

  constructor() {
    this.metrics = {
      connections: {
        total: 0,
        active: 0,
        peak: 0,
      },
      events: new Map(),
      errors: {
        total: 0,
        byType: new Map(),
      },
      startTime: Date.now(),
    };

    // Log metrics summary every 5 minutes
    setInterval(() => {
      this.logMetricsSummary();
    }, 300000);
  }

  /**
   * Record new connection
   */
  recordConnection(): void {
    this.metrics.connections.total++;
    this.metrics.connections.active++;

    if (this.metrics.connections.active > this.metrics.connections.peak) {
      this.metrics.connections.peak = this.metrics.connections.active;
    }

    logger.debug('Connection metrics updated', {
      total: this.metrics.connections.total,
      active: this.metrics.connections.active,
      peak: this.metrics.connections.peak,
    });
  }

  /**
   * Record disconnection
   */
  recordDisconnection(): void {
    this.metrics.connections.active = Math.max(0, this.metrics.connections.active - 1);

    logger.debug('Disconnection metrics updated', {
      active: this.metrics.connections.active,
    });
  }

  /**
   * Record event
   */
  recordEvent(eventName: string, latencyMs?: number): void {
    const eventMetrics = this.metrics.events.get(eventName) || {
      count: 0,
      errors: 0,
      totalLatency: 0,
    };

    eventMetrics.count++;
    if (latencyMs !== undefined) {
      eventMetrics.totalLatency += latencyMs;
    }

    this.metrics.events.set(eventName, eventMetrics);
  }

  /**
   * Record event error
   */
  recordEventError(eventName: string): void {
    const eventMetrics = this.metrics.events.get(eventName) || {
      count: 0,
      errors: 0,
      totalLatency: 0,
    };

    eventMetrics.errors++;
    this.metrics.events.set(eventName, eventMetrics);

    this.recordError(eventName);
  }

  /**
   * Record error
   */
  recordError(errorType: string): void {
    this.metrics.errors.total++;

    const typeCount = this.metrics.errors.byType.get(errorType) || 0;
    this.metrics.errors.byType.set(errorType, typeCount + 1);
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics() {
    return {
      ...this.metrics.connections,
      uptime: Date.now() - this.metrics.startTime,
    };
  }

  /**
   * Get event metrics
   */
  getEventMetrics() {
    const eventMetrics: any[] = [];

    this.metrics.events.forEach((metrics, eventName) => {
      const avgLatency = metrics.count > 0
        ? metrics.totalLatency / metrics.count
        : 0;

      eventMetrics.push({
        event: eventName,
        count: metrics.count,
        errors: metrics.errors,
        errorRate: metrics.count > 0 ? (metrics.errors / metrics.count) * 100 : 0,
        avgLatency: Math.round(avgLatency * 100) / 100,
      });
    });

    return eventMetrics.sort((a, b) => b.count - a.count);
  }

  /**
   * Get error metrics
   */
  getErrorMetrics() {
    const errorsByType: any[] = [];

    this.metrics.errors.byType.forEach((count, errorType) => {
      errorsByType.push({
        type: errorType,
        count,
      });
    });

    return {
      total: this.metrics.errors.total,
      byType: errorsByType.sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics() {
    return {
      connections: this.getConnectionMetrics(),
      events: this.getEventMetrics(),
      errors: this.getErrorMetrics(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log metrics summary
   */
  logMetricsSummary(): void {
    const summary = this.getAllMetrics();

    logger.info('Metrics summary', {
      connections: summary.connections,
      totalEvents: summary.events.reduce((sum, e) => sum + e.count, 0),
      totalErrors: summary.errors.total,
    });

    // Log top 5 most frequent events
    if (summary.events.length > 0) {
      logger.info('Top events', {
        events: summary.events.slice(0, 5),
      });
    }

    // Log error types if any
    if (summary.errors.total > 0) {
      logger.warn('Errors summary', {
        total: summary.errors.total,
        byType: summary.errors.byType.slice(0, 5),
      });
    }
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset(): void {
    this.metrics = {
      connections: {
        total: 0,
        active: 0,
        peak: 0,
      },
      events: new Map(),
      errors: {
        total: 0,
        byType: new Map(),
      },
      startTime: Date.now(),
    };

    logger.info('Metrics reset');
  }
}

// Export singleton instance
export const metrics = new MetricsCollector();

/**
 * Middleware to track event latency
 */
export const trackEventLatency = (eventName: string) => {
  const startTime = Date.now();

  return {
    end: (success: boolean = true) => {
      const latency = Date.now() - startTime;
      if (success) {
        metrics.recordEvent(eventName, latency);
      } else {
        metrics.recordEventError(eventName);
      }
    },
  };
};

export default metrics;
