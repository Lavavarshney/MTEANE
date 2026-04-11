import 'dotenv/config';
import { buildApp } from './api';
import { config } from './shared/config';
import { logger } from './utils/logger';

const start = async () => {
  const app = await buildApp();
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
