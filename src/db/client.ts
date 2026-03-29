import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';

const isNeon = config.DATABASE_URL.includes('neon.tech');

export const db = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: isNeon ? { rejectUnauthorized: true } : false,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: isNeon ? 20_000 : 5_000,
  statement_timeout: isNeon ? 15_000 : 5_000,
  keepAlive: true,
});

const isTransientConnectionError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Connection terminated due to connection timeout') ||
    message.includes('Connection terminated unexpectedly') ||
    message.includes('ECONNRESET') ||
    message.includes('ETIMEDOUT')
  );
};

export async function query<T extends QueryResultRow = any>(
  text: string,
  params: any[] = [],
): Promise<QueryResult<T>> {
  if (config.NODE_ENV === 'development') {
    logger.debug({ sql: text, params: params.length > 0 ? params : undefined }, '[SQL]');
  }

  try {
    return await db.query<T>(text, params);
  } catch (error) {
    if (isTransientConnectionError(error)) {
      if (config.NODE_ENV === 'development') {
        logger.warn('[SQL Retry] Retrying transient connection failure...');
      }
      return await db.query<T>(text, params);
    }

    if (config.NODE_ENV === 'development') {
      logger.error({ sql: text, params, error }, '[SQL Error]');
    }
    throw error;
  }
}
