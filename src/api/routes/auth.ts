import { randomBytes } from 'crypto';
import type { FastifyInstance } from 'fastify';
import { createApiKey } from '../../db/queries/apiKeys';
import { createOrg } from '../../db/queries/orgs';
import { hashApiKey } from '../../utils/hash';

export const authRoutes = async (app: FastifyInstance) => {
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
  }, async (request, reply) => {
    const body = request.body as { name: string; slug: string };

    try {
      const org = await createOrg(body.name, body.slug);
      const apiKey = randomBytes(32).toString('hex');
      const keyHash = hashApiKey(apiKey);

      await createApiKey(org.id, keyHash, 'primary');

      return reply.status(201).send({
        org_id: org.id,
        api_key: apiKey,
        warning: 'Store this key — it will never be shown again',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      if (message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')) {
        return reply.status(409).send({ message: 'Organization slug already exists' });
      }
      throw error;
    }
  });
};
