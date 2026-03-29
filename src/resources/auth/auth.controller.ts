import { randomBytes } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { createOrg, createApiKey } from './auth.model';
import { hashApiKey } from '../../utils/hash';

export const register = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as { name: string; slug: string };

  try {
    const org = await createOrg(body.name, body.slug);
    const apiKey = randomBytes(32).toString('hex');
    await createApiKey(org.id, hashApiKey(apiKey), 'primary');

    return reply.status(201).send({
      org_id: org.id,
      api_key: apiKey,
      warning: 'Store this key — it will never be shown again',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    if (
      message.toLowerCase().includes('duplicate') ||
      message.toLowerCase().includes('unique')
    ) {
      return reply.status(409).send({ message: 'Organization slug already exists' });
    }
    throw error;
  }
};
