import { config } from './config';
import logger from './utils/logger';
import database from './utils/database';
import rabbitmqService from './services/rabbitmq.service';
import fcmService from './services/fcm.service';
import emailService from './services/email.service';
import smsService from './services/sms.service';
import { mediaQueue } from './queues/media.queue';
import { notificationQueue } from './queues/notification.queue';
import { cleanupQueue } from './queues/cleanup.queue';
import processMediaJob from './processors/media.processor';
import processNotificationJob from './processors/notification.processor';
import processCleanupJob from './processors/cleanup.processor';
import scheduledJobs from './jobs/scheduled';
import { closeAllQueues } from './queues';
import express from 'express';
import { getQueueMetrics, getSystemMetrics } from './monitoring/metrics';

const app = express();

async function bootstrap(): Promise<void> {
  try {
    logger.info('Starting SUP Messenger Worker Service...');

    // Initialize database connection
    await database.connect();

    // Initialize external services
    fcmService.initialize();
    emailService.initialize();
    smsService.initialize();

    // Initialize RabbitMQ connection
    await rabbitmqService.connect();

    // Setup queue processors
    setupQueueProcessors();

    // Setup RabbitMQ consumers
    await setupRabbitMQConsumers();

    // Start scheduled jobs
    scheduledJobs.start();

    // Start monitoring/metrics server
    startMonitoringServer();

    logger.info('Worker service started successfully');
  } catch (error) {
    logger.error('Failed to start worker service', { error });
    process.exit(1);
  }
}

function setupQueueProcessors(): void {
  logger.info('Setting up queue processors');

  // Media queue processor
  mediaQueue.process(config.jobs.concurrency.media, async (job) => {
    return await processMediaJob(job);
  });

  // Notification queue processor
  notificationQueue.process(config.jobs.concurrency.notification, async (job) => {
    return await processNotificationJob(job);
  });

  // Cleanup queue processor
  cleanupQueue.process(config.jobs.concurrency.cleanup, async (job) => {
    return await processCleanupJob(job);
  });

  logger.info('Queue processors configured');
}

async function setupRabbitMQConsumers(): Promise<void> {
  logger.info('Setting up RabbitMQ consumers');

  // Assert queues
  await rabbitmqService.assertQueue(config.rabbitmq.queues.media);
  await rabbitmqService.assertQueue(config.rabbitmq.queues.notification);
  await rabbitmqService.assertQueue(config.rabbitmq.queues.cleanup);

  // Bind queues to exchange
  await rabbitmqService.bindQueue(config.rabbitmq.queues.media, 'media.*');
  await rabbitmqService.bindQueue(config.rabbitmq.queues.notification, 'notification.*');
  await rabbitmqService.bindQueue(config.rabbitmq.queues.cleanup, 'cleanup.*');

  // Consume messages from RabbitMQ and add to Bull queues
  await rabbitmqService.consume(
    config.rabbitmq.queues.media,
    async (message) => {
      await mediaQueue.add(message, {
        priority: message.type === 'image' ? 2 : 1,
        timeout: message.type === 'video' ? 300000 : 60000,
      });
    },
    { prefetch: config.jobs.concurrency.media }
  );

  await rabbitmqService.consume(
    config.rabbitmq.queues.notification,
    async (message) => {
      await notificationQueue.add(message, {
        priority: message.type === 'push' ? 3 : 1,
        timeout: 30000,
      });
    },
    { prefetch: config.jobs.concurrency.notification }
  );

  await rabbitmqService.consume(
    config.rabbitmq.queues.cleanup,
    async (message) => {
      await cleanupQueue.add(message, {
        timeout: 120000,
      });
    },
    { prefetch: config.jobs.concurrency.cleanup }
  );

  logger.info('RabbitMQ consumers configured');
}

function startMonitoringServer(): void {
  app.use(express.json());

  // Health check endpoint
  app.get('/health', async (req, res) => {
    try {
      await database.query('SELECT 1');
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Queue metrics endpoint
  app.get('/metrics/queues', async (req, res) => {
    try {
      const metrics = await getQueueMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // System metrics endpoint
  app.get('/metrics/system', (req, res) => {
    try {
      const metrics = getSystemMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Graceful shutdown endpoint
  app.post('/shutdown', async (req, res) => {
    res.json({ message: 'Shutting down...' });
    await gracefulShutdown();
  });

  app.listen(config.port, () => {
    logger.info(`Monitoring server listening on port ${config.port}`);
  });
}

async function gracefulShutdown(): Promise<void> {
  logger.info('Initiating graceful shutdown...');

  try {
    // Stop scheduled jobs
    scheduledJobs.stop();

    // Close queues
    await closeAllQueues(mediaQueue, notificationQueue, cleanupQueue);

    // Disconnect from RabbitMQ
    await rabbitmqService.disconnect();

    // Disconnect from database
    await database.disconnect();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', { reason, promise });
});

// Start the service
bootstrap();
