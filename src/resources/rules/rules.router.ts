import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../../middleware/auth';
import {
	createRuleHandler,
	deleteRuleHandler,
	getRuleLogsHandler,
	listRulesHandler,
	patchRuleHandler,
} from './rules.controller';

export const rulesRouter = async (app: FastifyInstance) => {
	app.post(
		'/rules',
		{
			preHandler: [authPreHandler],
			schema: {
				description:
					'Create a new rule. Rules are evaluated whenever a matching event_type is ingested.',
				tags: ['Rules'],
				body: {
					type: 'object',
					required: ['name', 'event_type', 'condition', 'action_type', 'action_config'],
					additionalProperties: false,
					properties: {
						name: { type: 'string', minLength: 1 },
						event_type: { type: 'string', minLength: 1, description: 'e.g. "user.signed_up"' },
						condition: {
							type: 'object',
							additionalProperties: true,
							description: '{ field, operator, value } — field uses dot-notation into event payload',
						},
						action_type: { type: 'string', enum: ['webhook', 'email', 'slack'] },
						action_config: { type: 'object', additionalProperties: true },
					},
				},
				response: {
					201: { type: 'object', additionalProperties: true },
					403: {
						type: 'object',
						properties: { message: { type: 'string' } },
					},
				},
				security: [{ apiKey: [] }],
			},
		},
		createRuleHandler,
	);

	app.get(
		'/rules',
		{
			preHandler: [authPreHandler],
			schema: {
				description:
					'List all rules for the authenticated organisation, including last_triggered_at from action logs.',
				tags: ['Rules'],
				response: {
					200: {
						type: 'object',
						properties: {
							rules: { type: 'array', items: { type: 'object', additionalProperties: true } },
						},
					},
				},
				security: [{ apiKey: [] }],
			},
		},
		listRulesHandler,
	);

	app.patch(
		'/rules/:id',
		{
			preHandler: [authPreHandler],
			schema: {
				description: 'Partially update a rule (name, condition, action_config, or is_active).',
				tags: ['Rules'],
				params: {
					type: 'object',
					required: ['id'],
					additionalProperties: false,
					properties: {
						id: { type: 'string', format: 'uuid' },
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
				response: {
					200: { type: 'object', additionalProperties: true },
					404: {
						type: 'object',
						properties: { message: { type: 'string' } },
					},
				},
				security: [{ apiKey: [] }],
			},
		},
		patchRuleHandler,
	);

	app.delete(
		'/rules/:id',
		{
			preHandler: [authPreHandler],
			schema: {
				description: 'Soft-delete (deactivate) a rule. The rule record is kept; is_active is set to false.',
				tags: ['Rules'],
				params: {
					type: 'object',
					required: ['id'],
					additionalProperties: false,
					properties: {
						id: { type: 'string', format: 'uuid' },
					},
				},
				response: {
					200: {
						type: 'object',
						properties: {
							id: { type: 'string', format: 'uuid' },
							is_active: { type: 'boolean' },
							status: { type: 'string', example: 'soft_deleted' },
						},
					},
					404: {
						type: 'object',
						properties: { message: { type: 'string' } },
					},
				},
				security: [{ apiKey: [] }],
			},
		},
		deleteRuleHandler,
	);

	app.get(
		'/rules/:id/logs',
		{
			preHandler: [authPreHandler],
			schema: {
				description: 'Get the action log history for a specific rule (last 50 entries).',
				tags: ['Rules'],
				params: {
					type: 'object',
					required: ['id'],
					additionalProperties: false,
					properties: {
						id: { type: 'string', format: 'uuid' },
					},
				},
				response: {
					200: {
						type: 'object',
						properties: {
							logs: { type: 'array', items: { type: 'object', additionalProperties: true } },
						},
					},
					404: {
						type: 'object',
						properties: { message: { type: 'string' } },
					},
				},
				security: [{ apiKey: [] }],
			},
		},
		getRuleLogsHandler,
	);
};
