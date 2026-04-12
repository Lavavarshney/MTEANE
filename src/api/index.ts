import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import fastifyPrintRoutes from 'fastify-print-routes';
import { config } from '../config';
import { healthRouter } from '../resources/health/health.router';
import { authRouter } from '../resources/auth/auth.router';
import { eventsRouter } from '../resources/events/events.router';
import { rulesRouter } from '../resources/rules/rules.router';
import { dlqRouter } from '../resources/dlq/dlq.router';
import { logsRouter } from '../resources/logs/logs.router';

export const buildApp = async () => {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport:
        config.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
    // Reject request bodies larger than 512 KB to prevent large-body DoS.
    bodyLimit: 524_288,
  });

  await app.register(fastifyPrintRoutes);

  // Swagger must be registered before any route plugins.
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Trigger API',
        description:
          'Event-driven rule engine: ingest events, evaluate rules, and fire webhook/email/Slack actions.',
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
            description: 'API key issued at POST /auth/register',
          },
        },
      },
      security: [{ apiKey: [] }],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  });

  await app.register(healthRouter);
  await app.register(authRouter);
  await app.register(eventsRouter);
  await app.register(rulesRouter);
  await app.register(dlqRouter);
  await app.register(logsRouter);

  return app;
};
