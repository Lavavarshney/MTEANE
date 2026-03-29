import type { FastifyInstance } from 'fastify';
import { register } from './auth.controller';

export const authRouter = async (app: FastifyInstance) => {
  app.post('/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'slug'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1 },
          slug: { type: 'string', minLength: 1 },
        },
      },
    },
  }, register);
};
