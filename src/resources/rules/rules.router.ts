import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../../middleware/auth';
import {
	createRuleHandler,
	deleteRuleHandler,
	listRulesHandler,
	patchRuleHandler,
} from './rules.controller';

export const rulesRouter = async (app: FastifyInstance) => {
	app.post(
		'/rules',
		{
			preHandler: [authPreHandler],
			schema: {
				body: {
					type: 'object',
					required: ['name', 'event_type', 'condition', 'action_type', 'action_config'],
					additionalProperties: false,
					properties: {
						name: { type: 'string', minLength: 1 },
						event_type: { type: 'string', minLength: 1 },
						condition: { type: 'object', additionalProperties: true },
						action_type: { type: 'string', enum: ['webhook', 'email', 'slack'] },
						action_config: { type: 'object', additionalProperties: true },
					},
				},
			},
		},
		createRuleHandler,
	);

	app.get(
		'/rules',
		{
			preHandler: [authPreHandler],
		},
		listRulesHandler,
	);

	app.patch(
		'/rules/:id',
		{
			preHandler: [authPreHandler],
			schema: {
				params: {
					type: 'object',
					required: ['id'],
					additionalProperties: false,
					properties: {
						id: { type: 'string' },
					},
				},
				body: {
					type: 'object',
					additionalProperties: false,
					properties: {
						name: { type: 'string', minLength: 1 },
						condition: { type: 'object', additionalProperties: true },
						action_config: { type: 'object', additionalProperties: true },
						is_active: { type: 'boolean' },
					},
				},
			},
		},
		patchRuleHandler,
	);

	app.delete(
		'/rules/:id',
		{
			preHandler: [authPreHandler],
			schema: {
				params: {
					type: 'object',
					required: ['id'],
					additionalProperties: false,
					properties: {
						id: { type: 'string' },
					},
				},
			},
		},
		deleteRuleHandler,
	);
};
