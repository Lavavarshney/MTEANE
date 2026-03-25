import type { FastifyInstance } from 'fastify';
import { insertEvent } from '../../db/queries/events';
import { authPreHandler } from '../../middleware/auth';

export const eventsRoutes = async (app: FastifyInstance) => {
  app.post('/events', {
    preHandler: authPreHandler,
    schema: {
      body: {
        type: 'object',
        required: ['event_type', 'payload'],
        additionalProperties: false,
        properties: {
          event_type: { type: 'string', pattern: '^[a-z]+\\.[a-z_]+$' },
          payload: { type: 'object', additionalProperties: true },
          idempotency_key: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
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

    return reply.status(200).send({
      event_id: event.id,
      received_at: event.created_at,
      status: 'received',
    });
  });
};
