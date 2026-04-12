import type { FastifyInstance } from 'fastify';
import { getHealth } from './health.controller';

export const healthRouter = async (app: FastifyInstance) => {
  app.get('/health', {
    schema: {
      description: 'Health check — returns 200 when the API is up',
      tags: ['Health'],
      security: [],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'ok' },
          },
        },
      },
    },
  }, getHealth);
};
