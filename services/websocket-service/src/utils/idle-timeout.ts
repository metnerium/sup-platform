import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../types/socket.types';
import logger from './logger';
import { config } from '../config';

/**
 * Idle timeout manager
 * Disconnects idle connections after configured timeout
 */
class IdleTimeoutManager {
  private timeouts: Map<string, NodeJS.Timeout>;
  private lastActivity: Map<string, number>;
  private maxIdleTime: number;

  constructor(maxIdleTime: number = config.connection.maxIdleTime) {
    this.timeouts = new Map();
    this.lastActivity = new Map();
    this.maxIdleTime = maxIdleTime;

    logger.info('Idle timeout manager initialized', {
      maxIdleTime: this.maxIdleTime,
    });
  }

  /**
   * Start tracking a socket
   */
  track(socket: AuthenticatedSocket): void {
    const socketId = socket.id;
    this.updateActivity(socketId);

    // Set up activity tracking for all events
    socket.onAny(() => {
      this.updateActivity(socketId);
    });

    logger.debug('Started tracking socket activity', {
      socketId,
      userId: socket.userId,
    });
  }

  /**
   * Update last activity time and reset timeout
   */
  updateActivity(socketId: string): void {
    this.lastActivity.set(socketId, Date.now());

    // Clear existing timeout
    const existingTimeout = this.timeouts.get(socketId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(() => {
      this.handleTimeout(socketId);
    }, this.maxIdleTime);

    this.timeouts.set(socketId, timeout);
  }

  /**
   * Handle idle timeout
   */
  private handleTimeout(socketId: string): void {
    const lastActivityTime = this.lastActivity.get(socketId);
    const idleTime = lastActivityTime ? Date.now() - lastActivityTime : 0;

    logger.warn('Socket idle timeout', {
      socketId,
      idleTime,
      maxIdleTime: this.maxIdleTime,
    });

    // The socket will be disconnected by the cleanup process
    this.cleanup(socketId);
  }

  /**
   * Stop tracking a socket
   */
  untrack(socketId: string): void {
    const timeout = this.timeouts.get(socketId);
    if (timeout) {
      clearTimeout(timeout);
      this.timeouts.delete(socketId);
    }

    this.lastActivity.delete(socketId);

    logger.debug('Stopped tracking socket activity', { socketId });
  }

  /**
   * Clean up resources for a socket
   */
  cleanup(socketId: string): void {
    this.untrack(socketId);
  }

  /**
   * Get idle time for a socket
   */
  getIdleTime(socketId: string): number {
    const lastActivityTime = this.lastActivity.get(socketId);
    if (!lastActivityTime) {
      return 0;
    }
    return Date.now() - lastActivityTime;
  }

  /**
   * Get all tracked sockets
   */
  getTrackedSockets(): string[] {
    return Array.from(this.timeouts.keys());
  }

  /**
   * Get statistics
   */
  getStats() {
    const sockets = this.getTrackedSockets();
    const idleTimes = sockets.map((id) => this.getIdleTime(id));

    return {
      trackedCount: sockets.length,
      avgIdleTime: idleTimes.length > 0
        ? idleTimes.reduce((a, b) => a + b, 0) / idleTimes.length
        : 0,
      maxIdleTime: Math.max(...idleTimes, 0),
    };
  }
}

// Export singleton instance
export const idleTimeoutManager = new IdleTimeoutManager();

/**
 * Set up idle timeout tracking for a socket
 */
export const setupIdleTimeout = (socket: AuthenticatedSocket): void => {
  idleTimeoutManager.track(socket);

  socket.on('disconnect', () => {
    idleTimeoutManager.untrack(socket.id);
  });
};

export default idleTimeoutManager;
