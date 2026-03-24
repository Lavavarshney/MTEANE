import type { FastifyInstance } from 'fastify';
import { query } from '../../shared/db';
import { redis } from '../../shared/queue';

const MEMORY_THRESHOLD_MB = 512;

export const healthRoutes = async (app: FastifyInstance) => {
  app.get('/health', async (_req, reply) => {
    let dbStatus: 'ok' | 'down' = 'ok';
    let redisStatus: 'ok' | 'down' = 'ok';

    try {
      await query('SELECT 1');
    } catch {
      dbStatus = 'down';
    }

    try {
      const pong = await redis.ping();
      if (pong !== 'PONG') {
        redisStatus = 'down';
      }
    } catch {
      redisStatus = 'down';
    }

    const memoryMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
    const memoryStatus: 'ok' | 'high' = memoryMb <= MEMORY_THRESHOLD_MB ? 'ok' : 'high';

    const isHealthy = dbStatus === 'ok' && redisStatus === 'ok' && memoryStatus === 'ok';

    const body = {
      status: isHealthy ? 'ok' : 'degraded',
      db: dbStatus,
      redis: redisStatus,
      memory: memoryStatus,
      memory_mb: memoryMb,
      uptime: process.uptime(),
    };

    return reply.status(isHealthy ? 200 : 503).send(body);
  });
};
