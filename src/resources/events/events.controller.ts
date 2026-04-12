import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { insertEvent } from './events.model';
import { enqueueEvent } from '../../queue/eventsQueue';
import { logger } from '../../utils/logger';

const receiveEventBodySchema = z.object({
  event_type: z.string().max(100).regex(/^[a-z]+\.[a-z_]+$/, 'event_type must match pattern: <noun>.<verb>'),
  payload: z.record(z.string().max(256), z.unknown()),
  idempotency_key: z.string().max(256).optional(),
});

export const receiveEvent = async (request: FastifyRequest, reply: FastifyReply) => {
  const parsed = receiveEventBodySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      message: 'Validation failed',
      errors: parsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
    });
  }

  const { event_type, payload, idempotency_key } = parsed.data;

  const event = await insertEvent(
    request.org.id,
    event_type,
    payload,
    idempotency_key,
  );

  try {
    await enqueueEvent(event.id, request.org.id, event_type);
  } catch (err) {
    logger.error({ err, event_id: event.id }, 'Failed to enqueue event — stored safely in DB');
  }

  return reply.status(200).send({
    event_id: event.id,
    received_at: event.created_at,
    status: 'received',
  });
};
