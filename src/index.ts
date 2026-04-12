import 'dotenv/config';
import { buildApp } from './api';
import { config } from './shared/config';
import { logger } from './utils/logger';
import { db } from './shared/db';
import { redis } from './shared/queue';
import { closeQueue } from './queue/eventsQueue';
import { closeDlqQueue } from './queue/dlqQueue';

const start = async () => {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    logger.info(`[api] ${signal} received — shutting down gracefully`);
    try {
      await app.close();
      await Promise.allSettled([closeQueue(), closeDlqQueue()]);
      await Promise.allSettled([db.end(), redis.quit()]);
      logger.info('[api] shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, '[api] error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start().catch(err => {
  logger.error({ err }, 'Failed to start');
  process.exit(1);
});
