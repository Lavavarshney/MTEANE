import 'dotenv/config';
import { db, query } from './shared/db';
import { redis } from './shared/queue';
import { logger } from './utils/logger';

const runSmoke = async () => {
  try {
    logger.info('Running smoke checks...');

    const dbResult = await query<{ ok: number }>('SELECT 1 AS ok');
    if (dbResult.rows[0]?.ok !== 1) {
      throw new Error('Postgres check failed: expected SELECT 1 to return 1');
    }
    logger.info('Postgres: OK');

    const redisResult = await redis.ping();
    if (redisResult !== 'PONG') {
      throw new Error(`Redis check failed: expected PONG, got ${redisResult}`);
    }
    logger.info('Redis: OK');

    logger.info('Smoke check passed: DB and Redis are reachable.');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Smoke check failed');
    process.exit(1);
  } finally {
    await Promise.allSettled([db.end(), redis.quit()]);
  }
};

runSmoke();
