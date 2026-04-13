import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../../middleware/auth';
import { listDlqHandler, retryDlqJobHandler } from './dlq.controller';

export async function dlqRouter(app: FastifyInstance) {
  app.get('/dlq', {
    preHandler: [authPreHandler],
    schema: {
      description: `List all jobs currently sitting in the **Dead Letter Queue** for the authenticated organisation.

**What is the DLQ?**
When an event job fails in the BullMQ \`events\` queue and exhausts all automatic retries, the worker moves it to a separate \`dlq\` BullMQ queue and marks all associated \`action_logs\` as \`dead\`. No more automatic processing happens — a human must intervene.

**Why does a job land here?**
- The webhook URL returned a consistent non-2xx for every attempt
- A downstream service (email SMTP, Slack) was unavailable
- An unhandled exception in the executor

**Fields per job**
| Field          | Meaning |
|----------------|---------|
| \`id\`            | BullMQ job ID (pass to POST /dlq/:job_id/retry) |
| \`eventId\`       | The original event UUID |
| \`eventType\`     | e.g. \`order.placed\` |
| \`failedReason\`  | Last error message from the worker |
| \`finalAttempt\`  | Whether this was the exhausting attempt |
| \`timestamp\`     | When the job was created (ms epoch) |
| \`processedOn\`   | When it was last processed (ms epoch) |

Results are filtered to the authenticated org — you cannot see other orgs' DLQ jobs.`,
      tags: ['DLQ'],
      response: {
        200: {
          description: 'DLQ jobs for this org',
          type: 'object',
          properties: {
            jobs: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
              description: 'Each item: id, eventId, orgId, eventType, failedReason, finalAttempt, timestamp, processedOn',
            },
          },
        },
      },
      security: [{ apiKey: [] }],
    },
  }, listDlqHandler);

  app.post('/dlq/:job_id/retry', {
    preHandler: [authPreHandler],
    schema: {
      description: `Manually re-queue a DLQ job for reprocessing.

**What this does (in order)**
1. Verifies the job exists and belongs to the authenticated org (403 if not).
2. Sets all \`action_logs\` for the event to \`status = 'retrying'\` so the UI reflects in-progress state.
3. Pushes a **new** job onto the main \`events\` BullMQ queue with the original \`eventId\`, \`orgId\`, and \`eventType\`.
4. Removes the job from the DLQ so it no longer appears in \`GET /dlq\`.

The worker will re-evaluate all active rules and re-execute matching actions exactly as if the event had just arrived. If it fails again it will go through normal BullMQ retries before landing in the DLQ a second time.

Get \`job_id\` from the \`id\` field returned by \`GET /dlq\`.`,
      tags: ['DLQ'],
      params: {
        type: 'object',
        required: ['job_id'],
        additionalProperties: false,
        properties: {
          job_id: { type: 'string', description: 'BullMQ DLQ job ID — from the id field in GET /dlq' },
        },
      },
      response: {
        200: {
          description: 'Job re-enqueued successfully',
          type: 'object',
          properties: {
            message: { type: 'string', description: 'e.g. "Job re-enqueued successfully"' },
            eventId: { type: 'string', format: 'uuid', description: 'The original event UUID that was re-queued' },
          },
        },
        400: {
          description: 'job_id param is missing or empty',
          type: 'object',
          properties: { message: { type: 'string' } },
        },
        403: {
          description: 'This DLQ job belongs to a different org',
          type: 'object',
          properties: { message: { type: 'string' } },
        },
        404: {
          description: 'No DLQ job with this ID exists',
          type: 'object',
          properties: { message: { type: 'string' } },
        },
      },
      security: [{ apiKey: [] }],
    },
  }, retryDlqJobHandler);
}
