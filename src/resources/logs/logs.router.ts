import type { FastifyInstance } from 'fastify';
import { authPreHandler } from '../../middleware/auth';
import { listLogsHandler, getStatsHandler } from './logs.controller';

export async function logsRouter(app: FastifyInstance) {
  app.get(
    '/logs',
    {
      preHandler: [authPreHandler],
      schema: {
        description: `Paginated list of every action log for the organisation — one row per **(event × rule)** execution. Ordered by \`created_at DESC\` (newest first).

Each row is enriched with the parent rule's \`name\`, \`action_type\`, and \`event_type\` so you don't need a second request.

**Pagination (cursor-based)**
Pass the \`next_cursor\` from the previous response as the \`cursor\` query parameter. Cursors are ISO-8601 timestamps. When \`next_cursor\` is \`null\` you have reached the last page.

**Filters**
- \`status\` — narrow to a single execution state (see values below)
- \`rule_id\` — narrow to a specific rule UUID
- Both filters can be combined

**status values**
| Value      | Meaning |
|------------|---------|
| \`pending\`  | Job queued, action not yet attempted |
| \`success\`  | Action ran and target responded without error |
| \`failed\`   | Action ran but returned an error or non-2xx |
| \`retrying\` | Manually re-queued from DLQ |
| \`dead\`     | Exhausted all retries; sitting in DLQ |`,
        tags: ['Logs'],
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'success', 'failed', 'retrying', 'dead'],
              description: 'Filter by action log status',
            },
            rule_id: { type: 'string', format: 'uuid', description: 'Filter by rule ID' },
            cursor: {
              type: 'string',
              format: 'date-time',
              description: 'Pagination cursor (created_at of last row from previous page)',
            },
            limit: {
              type: 'string',
              description: 'Page size (1–100, default 20)',
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              logs: { type: 'array', items: { type: 'object', additionalProperties: true } },
              next_cursor: { type: ['string', 'null'] },
            },
          },
        },
        security: [{ apiKey: [] }],
      },
    },
    listLogsHandler,
  );

  app.get(
    '/stats',
    {
      preHandler: [authPreHandler],
      schema: {
        description: `Aggregate dashboard statistics for the organisation, computed in a single SQL query.

**Fields returned**
| Field                | How it is computed |
|----------------------|--------------------|
| \`total_events\`       | COUNT of all rows in the \`events\` table for this org |
| \`total_actions_fired\`| COUNT of all rows in \`action_logs\` for this org |
| \`success_rate\`       | \`(success_count / total_actions_fired) × 100\`, rounded to 2 dp. Returns \`0\` when no actions have fired yet |
| \`top_rules\`          | Top 5 rules by fire count (action_log rows), each with \`id\`, \`name\`, \`action_type\`, \`event_type\`, \`fire_count\` |

All counts include all-time data — there is no date range filter.`,
        tags: ['Logs'],
        response: {
          200: {
            type: 'object',
            properties: {
              total_events: { type: 'number' },
              total_actions_fired: { type: 'number' },
              success_rate: { type: 'number', description: 'Percentage (0–100)' },
              top_rules: { type: 'array', items: { type: 'object', additionalProperties: true } },
            },
          },
        },
        security: [{ apiKey: [] }],
      },
    },
    getStatsHandler,
  );
}
