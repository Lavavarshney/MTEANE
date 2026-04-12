import { randomBytes } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createOrg, createApiKey } from './auth.model';
import { hashApiKey } from '../../utils/hash';

const registerBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const register = async (request: FastifyRequest, reply: FastifyReply) => {
  const parsed = registerBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Validation failed',
      errors: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const { name, slug } = parsed.data;

  try {
    const org = await createOrg(name, slug);
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
