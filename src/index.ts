import 'dotenv/config';
import { buildApp } from './api';
import { config } from './shared/config';

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
  console.error('Failed to start:', err);
  process.exit(1);
});
