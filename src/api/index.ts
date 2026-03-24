import Fastify from 'fastify';
import { authRoutes } from './routes/auth';
import { eventsRoutes } from './routes/events';
import { healthRoutes } from './routes/health';

export const buildApp = async () => {
  const app = Fastify({ logger: true });

  await app.register(authRoutes);
  await app.register(eventsRoutes);
  await app.register(healthRoutes);

  return app;
};
