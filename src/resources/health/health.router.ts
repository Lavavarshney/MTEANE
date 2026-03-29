import type { FastifyInstance } from 'fastify';
import { getHealth } from './health.controller';

export const healthRouter = async (app: FastifyInstance) => {
  app.get('/health', getHealth);
};
