import type { FastifyRequest, FastifyReply } from 'fastify';
import { insertEvent } from './events.model';
import { enqueueEvent } from '../../queue/eventsQueue';
import { logger } from '../../utils/logger';

export const receiveEvent = async (request: FastifyRequest, reply: FastifyReply) => {
  const body = request.body as {
    event_type: string;
    payload: Record<string, unknown>;
    idempotency_key?: string;
  };

  const event = await insertEvent(
    request.org.id,
    body.event_type,
    body.payload,
    body.idempotency_key,
  );

  try {
    await enqueueEvent(event.id, request.org.id, body.event_type);
  } catch (err) {
    logger.error({ err, event_id: event.id }, 'Failed to enqueue event — stored safely in DB');
  }

  return reply.status(200).send({
    event_id: event.id,
    received_at: event.created_at,
    status: 'received',
  });
};
