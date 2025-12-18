import { mediaQueue } from '../queues/media.queue';
import { notificationQueue } from '../queues/notification.queue';
import { cleanupQueue } from '../queues/cleanup.queue';
import logger from '../utils/logger';
import os from 'os';

interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

interface SystemMetrics {
  cpu: {
    usage: number;
    count: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  process: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    pid: number;
  };
}

interface MetricsResponse {
  queues: QueueMetrics[];
  timestamp: string;
}

export async function getQueueMetrics(): Promise<MetricsResponse> {
  try {
    const [mediaMetrics, notificationMetrics, cleanupMetrics] = await Promise.all([
      getQueueStats(mediaQueue, 'media'),
      getQueueStats(notificationQueue, 'notification'),
      getQueueStats(cleanupQueue, 'cleanup'),
    ]);

    return {
      queues: [mediaMetrics, notificationMetrics, cleanupMetrics],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get queue metrics', { error });
    throw error;
  }
}

async function getQueueStats(queue: any, name: string): Promise<QueueMetrics> {
  const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
    queue.isPaused(),
  ]);

  return {
    name,
    waiting,
    active,
    completed,
    failed,
    delayed,
    paused,
  };
}

export function getSystemMetrics(): SystemMetrics {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  // Calculate CPU usage
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  });

  const cpuUsage = 100 - ~~((100 * totalIdle) / totalTick);

  return {
    cpu: {
      usage: cpuUsage,
      count: cpus.length,
    },
    memory: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      usagePercent: (usedMemory / totalMemory) * 100,
    },
    process: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      pid: process.pid,
    },
  };
}

export class MetricsCollector {
  private metrics: Map<string, number[]> = new Map();
  private readonly maxSamples = 100;

  recordJobDuration(queueName: string, duration: number): void {
    const key = `${queueName}_duration`;
    const samples = this.metrics.get(key) || [];
    samples.push(duration);

    if (samples.length > this.maxSamples) {
      samples.shift();
    }

    this.metrics.set(key, samples);
  }

  recordJobSuccess(queueName: string): void {
    const key = `${queueName}_success`;
    const count = this.metrics.get(key)?.[0] || 0;
    this.metrics.set(key, [count + 1]);
  }

  recordJobFailure(queueName: string): void {
    const key = `${queueName}_failure`;
    const count = this.metrics.get(key)?.[0] || 0;
    this.metrics.set(key, [count + 1]);
  }

  getAverageDuration(queueName: string): number {
    const key = `${queueName}_duration`;
    const samples = this.metrics.get(key) || [];

    if (samples.length === 0) {
      return 0;
    }

    const sum = samples.reduce((a, b) => a + b, 0);
    return sum / samples.length;
  }

  getSuccessRate(queueName: string): number {
    const successKey = `${queueName}_success`;
    const failureKey = `${queueName}_failure`;

    const successCount = this.metrics.get(successKey)?.[0] || 0;
    const failureCount = this.metrics.get(failureKey)?.[0] || 0;

    const total = successCount + failureCount;
    if (total === 0) {
      return 0;
    }

    return (successCount / total) * 100;
  }

  getMetricsSummary(): Record<string, any> {
    const queues = ['media', 'notification', 'cleanup'];
    const summary: Record<string, any> = {};

    for (const queue of queues) {
      summary[queue] = {
        averageDuration: this.getAverageDuration(queue),
        successRate: this.getSuccessRate(queue),
        successCount: this.metrics.get(`${queue}_success`)?.[0] || 0,
        failureCount: this.metrics.get(`${queue}_failure`)?.[0] || 0,
      };
    }

    return summary;
  }

  reset(): void {
    this.metrics.clear();
  }
}

export const metricsCollector = new MetricsCollector();
export default { getQueueMetrics, getSystemMetrics, metricsCollector };
