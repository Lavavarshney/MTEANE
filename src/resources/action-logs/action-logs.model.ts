import { query } from '../../shared/db';

export interface ActionLog {
  id: string;
  event_id: string;
  rule_id: string;
  org_id: string;
  status: 'pending' | 'success' | 'failed' | 'retrying' | 'dead';
  attempt_count: number;
  error_message: string | null;
  response_body: string | null;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateActionLogInput {
  status: ActionLog['status'];
  response_body?: string;
  error_message?: string;
  executed_at?: Date;
}

/**
 * Upsert an action log for a given event+rule pair.
 * On conflict (same event_id + rule_id), resets status back to 'pending'
 * so retry runs cleanly update the existing row.
 */
export async function findOrCreateActionLog(
  eventId: string,
  ruleId: string,
  orgId: string,
): Promise<ActionLog> {
  const result = await query<ActionLog>(
    `INSERT INTO action_logs (event_id, rule_id, org_id, status)
     VALUES ($1, $2, $3, 'pending')
     ON CONFLICT (event_id, rule_id) DO UPDATE
       SET status = 'pending', updated_at = CURRENT_TIMESTAMP
     RETURNING id, event_id, rule_id, org_id, status, attempt_count,
               error_message, response_body, executed_at, created_at, updated_at`,
    [eventId, ruleId, orgId],
  );

  if (!result.rows[0]) {
    throw new Error('Failed to find or create action log');
  }

  return result.rows[0];
}

/**
 * Bulk-update all action_logs for a given event to a new status.
 * Scoped by org_id for defence-in-depth — prevents one org's event_id
 * from accidentally (or deliberately) touching another org's rows.
 * Used by the worker's failed handler (mark 'dead') and DLQ retry (mark 'retrying').
 */
export async function updateActionLogsByEventId(
  eventId: string,
  status: ActionLog['status'],
  orgId: string,
): Promise<void> {
  await query(
    `UPDATE action_logs
     SET status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE event_id = $1 AND org_id = $3`,
    [eventId, status, orgId],
  );
}

export async function updateActionLog(
  id: string,
  patch: UpdateActionLogInput,
): Promise<ActionLog | null> {
  const result = await query<ActionLog>(
    `UPDATE action_logs
     SET
       status        = $2,
       response_body = COALESCE($3, response_body),
       error_message = COALESCE($4, error_message),
       executed_at   = COALESCE($5, executed_at),
       attempt_count = attempt_count + 1,
       updated_at    = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, event_id, rule_id, org_id, status, attempt_count,
               error_message, response_body, executed_at, created_at, updated_at`,
    [
      id,
      patch.status,
      patch.response_body ?? null,
      patch.error_message ?? null,
      patch.executed_at ?? null,
    ],
  );

  return result.rows[0] ?? null;
}
