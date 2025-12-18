import amqp, { Channel, Connection, ConsumeMessage } from 'amqplib';
import { config } from '../config';
import logger from '../utils/logger';

type MessageHandler = (message: any) => Promise<void>;

class RabbitMQService {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  async connect(): Promise<void> {
    try {
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange(config.rabbitmq.exchange, 'topic', {
        durable: true,
      });

      // Setup error handlers
      this.connection.on('error', (err) => {
        logger.error('RabbitMQ connection error', { error: err.message });
        this.reconnect();
      });

      this.connection.on('close', () => {
        logger.warn('RabbitMQ connection closed, attempting to reconnect');
        this.reconnect();
      });

      logger.info('Connected to RabbitMQ successfully');
    } catch (error) {
      logger.error('Failed to connect to RabbitMQ', { error });
      this.reconnect();
      throw error;
    }
  }

  private reconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }

    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      try {
        await this.connect();
      } catch (error) {
        logger.error('Failed to reconnect to RabbitMQ', { error });
      }
    }, 5000);
  }

  async assertQueue(queueName: string, options?: any): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      await this.channel.assertQueue(queueName, {
        durable: true,
        ...options,
      });

      logger.info('Queue asserted', { queueName });
    } catch (error) {
      logger.error('Failed to assert queue', { error, queueName });
      throw error;
    }
  }

  async bindQueue(queueName: string, routingKey: string): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      await this.channel.bindQueue(queueName, config.rabbitmq.exchange, routingKey);
      logger.info('Queue bound to exchange', { queueName, routingKey });
    } catch (error) {
      logger.error('Failed to bind queue', { error, queueName, routingKey });
      throw error;
    }
  }

  async publish(routingKey: string, message: any): Promise<boolean> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      const sent = this.channel.publish(
        config.rabbitmq.exchange,
        routingKey,
        Buffer.from(JSON.stringify(message)),
        {
          persistent: true,
          contentType: 'application/json',
        }
      );

      if (sent) {
        logger.debug('Message published to RabbitMQ', { routingKey });
      } else {
        logger.warn('Failed to publish message (buffer full)', { routingKey });
      }

      return sent;
    } catch (error) {
      logger.error('Failed to publish message', { error, routingKey });
      throw error;
    }
  }

  async consume(queueName: string, handler: MessageHandler, options?: any): Promise<void> {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    try {
      await this.channel.prefetch(options?.prefetch || 1);

      await this.channel.consume(
        queueName,
        async (msg: ConsumeMessage | null) => {
          if (!msg) {
            return;
          }

          try {
            const content = JSON.parse(msg.content.toString());
            logger.debug('Message received from RabbitMQ', { queueName, content });

            await handler(content);

            this.channel?.ack(msg);
            logger.debug('Message acknowledged', { queueName });
          } catch (error) {
            logger.error('Failed to process message', { error, queueName });

            // Retry logic
            const retryCount = (msg.properties.headers?.['x-retry-count'] || 0) + 1;
            const maxRetries = options?.maxRetries || 3;

            if (retryCount < maxRetries) {
              // Requeue with incremented retry count
              this.channel?.nack(msg, false, false);

              const retryMessage = {
                ...JSON.parse(msg.content.toString()),
                headers: {
                  'x-retry-count': retryCount,
                },
              };

              setTimeout(() => {
                this.publish(`${queueName}.retry`, retryMessage);
              }, 5000 * retryCount); // Exponential backoff

              logger.info('Message requeued for retry', { queueName, retryCount });
            } else {
              // Send to dead letter queue
              this.channel?.nack(msg, false, false);
              await this.publish(`${queueName}.dead`, {
                originalMessage: JSON.parse(msg.content.toString()),
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString(),
              });

              logger.error('Message sent to dead letter queue', { queueName, retryCount });
            }
          }
        },
        {
          noAck: false,
        }
      );

      logger.info('Consuming messages from queue', { queueName });
    } catch (error) {
      logger.error('Failed to consume messages', { error, queueName });
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('Disconnected from RabbitMQ');
    } catch (error) {
      logger.error('Error disconnecting from RabbitMQ', { error });
    }
  }

  getChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }
    return this.channel;
  }
}

export const rabbitmqService = new RabbitMQService();
export default rabbitmqService;
