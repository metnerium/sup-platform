import pgPromise from 'pg-promise';
import { config } from './index';
import { logger } from '../utils/logger';

const pgp = pgPromise({
  error(err, e) {
    logger.error('Database error:', { error: err.message, context: e.query });
  },
});

export const db = pgp(config.database.url);

// Test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await db.one('SELECT 1 as test');
    logger.info('Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  await pgp.end();
  logger.info('Database connections closed');
}

export default db;
