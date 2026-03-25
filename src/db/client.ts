import { Pool, QueryResult, QueryResultRow } from 'pg';
import { config } from '../config';

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
    console.log('[SQL]', text, params.length > 0 ? params : '');
  }

  try {
    return await db.query<T>(text, params);
  } catch (error) {
    if (isTransientConnectionError(error)) {
      if (config.NODE_ENV === 'development') {
        console.warn('[SQL Retry] Retrying transient connection failure...');
      }
      return await db.query<T>(text, params);
    }

    if (config.NODE_ENV === 'development') {
      console.error('[SQL Error]', text, params, error);
    }
    throw error;
  }
}
