import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../../middleware/auth';
import { listDlqHandler, retryDlqJobHandler } from './dlq.controller';

export async function dlqRouter(app: FastifyInstance) {
  app.get('/dlq', {
    preHandler: [authPreHandler],
    schema: {
      description:
        'List all Dead Letter Queue jobs for the authenticated organisation (events that exhausted all retries).',
      tags: ['DLQ'],
      response: {
        200: {
          type: 'object',
          properties: {
            jobs: { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
      },
      security: [{ apiKey: [] }],
    },
  }, listDlqHandler);

  app.post('/dlq/:job_id/retry', {
    preHandler: [authPreHandler],
    schema: {
      description:
        'Re-queue a DLQ job for reprocessing. The associated action logs are reset to "retrying" status.',
      tags: ['DLQ'],
      params: {
        type: 'object',
        required: ['job_id'],
        additionalProperties: false,
        properties: {
          job_id: { type: 'string', description: 'BullMQ job ID from the DLQ' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
        404: {
          type: 'object',
          properties: { message: { type: 'string' } },
        },
      },
      security: [{ apiKey: [] }],
    },
  }, retryDlqJobHandler);
}
