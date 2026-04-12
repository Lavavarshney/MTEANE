import type { FastifyInstance } from 'fastify';
import { register } from './auth.controller';

export const authRouter = async (app: FastifyInstance) => {
  app.post('/auth/register', {
    schema: {
      description:
        'Register a new organisation and receive an API key. The key must be sent as the x-api-key header on all subsequent requests.',
      tags: ['Auth'],
      security: [],
      body: {
        type: 'object',
        required: ['name', 'slug'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, description: 'Display name of the organisation' },
          slug: {
            type: 'string',
            minLength: 1,
            description: 'Unique URL-safe identifier (e.g. "acme-corp")',
          },
        },
      },
      response: {
        201: {
          type: 'object',
          properties: {
            org_id: { type: 'string', format: 'uuid' },
            api_key: { type: 'string', description: 'Keep this safe — it will not be shown again' },
          },
        },
      },
    },
  }, register);
};
