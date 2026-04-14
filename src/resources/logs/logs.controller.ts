import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { listActionLogs, getOrgStats, type ListActionLogsFilters } from './logs.model';

const VALID_STATUSES = ['pending', 'success', 'failed', 'retrying', 'dead'] as const;

const listLogsQuerySchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  rule_id: z.uuid().optional(),
  // { offset: true } required in Zod v4 — without it, only Z-suffix is accepted
  // and +HH:MM offsets (valid ISO 8601) are incorrectly rejected.
  cursor: z.string().datetime({ offset: true }).optional(),
  limit: z
    .string()
    .optional()
    .transform(v => {
      const n = v !== undefined ? Number(v) : 20;
      return Number.isNaN(n) ? 20 : Math.min(Math.max(n, 1), 100);
    }),
});

function sendValidationError(reply: FastifyReply, error: z.ZodError) {
  return reply.status(400).send({
    message: 'Validation failed',
    errors: error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });
}

export const listLogsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> => {
  const parsed = listLogsQuerySchema.safeParse(request.query);
  if (!parsed.success) {
    return sendValidationError(reply, parsed.error);
  }

  const { status, rule_id, cursor, limit } = parsed.data;

  const filters: ListActionLogsFilters = {
    status,
    ruleId: rule_id,
    cursor,
    limit,
  };

  const logs = await listActionLogs(request.org.id, filters);
  const nextCursor =
    logs.length === limit ? logs[logs.length - 1]?.created_at ?? null : null;

  return reply.status(200).send({ logs, next_cursor: nextCursor });
};

export const getStatsHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<FastifyReply> => {
  const stats = await getOrgStats(request.org.id);
  return reply.status(200).send(stats);
};
