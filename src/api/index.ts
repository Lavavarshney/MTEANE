import Fastify from 'fastify';
import fastifyPrintRoutes from 'fastify-print-routes';
import { config } from '../config';
import { healthRouter } from '../resources/health/health.router';
import { authRouter } from '../resources/auth/auth.router';
import { eventsRouter } from '../resources/events/events.router';
import { rulesRouter } from '../resources/rules/rules.router';

export const buildApp = async () => {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  await app.register(fastifyPrintRoutes);
  await app.register(healthRouter);
  await app.register(authRouter);
  await app.register(eventsRouter);
  await app.register(rulesRouter);

  return app;
};
