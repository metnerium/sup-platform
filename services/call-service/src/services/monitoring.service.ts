import { callRepository } from '../repositories/call.repository';
import { livekitService } from './livekit.service';
import { logger } from '../utils/logger';

export class MonitoringService {
  /**
   * Get comprehensive metrics
   */
  async getMetrics() {
    try {
      const [callStats, activeRoomsCount] = await Promise.all([
        callRepository.getCallStats(),
        livekitService.getActiveRoomsCount(),
      ]);

      const successRate =
        callStats.totalCalls > 0
          ? ((callStats.completedCalls / callStats.totalCalls) * 100).toFixed(2)
          : '0.00';

      return {
        calls: {
          total: callStats.totalCalls,
          active: callStats.activeCalls,
          completed: callStats.completedCalls,
          failed: callStats.failedCalls,
        },
        livekit: {
          activeRooms: activeRoomsCount,
        },
        performance: {
          successRate: `${successRate}%`,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to get metrics', { error });
      throw error;
    }
  }

  /**
   * Get service health status
   */
  async getHealth() {
    try {
      const metrics = await this.getMetrics();

      const isHealthy = metrics.calls.failed < metrics.calls.total * 0.1; // Less than 10% failure rate

      return {
        status: isHealthy ? 'healthy' : 'degraded',
        service: 'call-service',
        metrics,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Health check failed', { error });
      return {
        status: 'unhealthy',
        service: 'call-service',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const monitoringService = new MonitoringService();
