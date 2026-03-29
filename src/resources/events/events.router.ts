import type { FastifyInstance } from 'fastify';
import { receiveEvent } from './events.controller';
import { authPreHandler } from '../../middleware/auth';

export const eventsRouter = async (app: FastifyInstance) => {
	app.post(
		'/events',
		{
			preHandler: [authPreHandler],
			schema: {
				body: {
					type: 'object',
					required: ['event_type', 'payload'],
					additionalProperties: false,
					properties: {
						event_type: { type: 'string', pattern: String.raw`^[a-z]+\.[a-z_]+$` },
						payload: { type: 'object', additionalProperties: true },
						idempotency_key: { type: 'string' }
					}
				}
			}
		},
		receiveEvent
	);
};
