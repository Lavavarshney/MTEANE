import type { FastifyInstance } from 'fastify';
import { receiveEvent } from './events.controller';
import { authPreHandler } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';

export const eventsRouter = async (app: FastifyInstance) => {
	app.post(
		'/events',
		{
			preHandler: [authPreHandler, rateLimiter],
			schema: {
				description:
					'Ingest a new event. The event is queued and processed asynchronously — matching rules will fire their configured actions.',
				tags: ['Events'],
				body: {
					type: 'object',
					required: ['event_type', 'payload'],
					additionalProperties: false,
					properties: {
						event_type: {
							type: 'string',
							pattern: String.raw`^[a-z]+\.[a-z_]+$`,
							description: 'dot-namespaced event identifier, e.g. "user.signed_up"',
						},
						payload: {
							type: 'object',
							additionalProperties: true,
							description: 'Arbitrary JSON payload passed to rule conditions',
						},
						idempotency_key: {
							type: 'string',
							description: 'Optional client-supplied key for deduplication',
						},
					},
				},
				response: {
					202: {
						type: 'object',
						properties: {
							event_id: { type: 'string', format: 'uuid' },
							status: { type: 'string', example: 'queued' },
						},
					},
				},
				security: [{ apiKey: [] }],
			},
		},
		receiveEvent,
	);
};
