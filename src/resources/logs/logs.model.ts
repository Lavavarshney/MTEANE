import { query } from '../../shared/db';
import type { ActionLog } from '../action-logs/action-logs.model';

/** ActionLog row enriched with rule metadata for the logs list endpoint. */
export interface ActionLogWithRule extends ActionLog {
  rule_name: string;
  rule_action_type: 'webhook' | 'email' | 'slack';
  rule_event_type: string;
}

export interface ListActionLogsFilters {
  status?: ActionLog['status'];
  ruleId?: string;
  /** ISO timestamp of the last item from the previous page. */
  cursor?: string;
  limit: number;
}

export interface OrgStats {
  total_events: number;
  total_actions_fired: number;
  success_rate: number;
  top_rules: Array<{
    id: string;
    name: string;
    action_type: string;
    event_type: string;
    fire_count: number;
  }>;
}

/**
 * Paginated list of action logs for an org.
 * Cursor is the `created_at` ISO string of the last row on the previous page.
 * Returns at most `filters.limit` rows ordered by created_at DESC.
 */
export async function listActionLogs(
  orgId: string,
  filters: ListActionLogsFilters,
): Promise<ActionLogWithRule[]> {
  const result = await query<ActionLogWithRule>(
    `SELECT
       al.id, al.event_id, al.rule_id, al.org_id, al.status,
       al.attempt_count, al.error_message, al.response_body,
       al.executed_at, al.created_at, al.updated_at,
       r.name  AS rule_name,
       r.action_type AS rule_action_type,
       r.event_type  AS rule_event_type
     FROM action_logs al
     JOIN rules r ON al.rule_id = r.id
     WHERE al.org_id = $1
       AND ($2::text    IS NULL OR al.status   = $2)
       AND ($3::uuid    IS NULL OR al.rule_id  = $3)
       AND ($4::timestamptz IS NULL OR al.created_at < $4::timestamptz)
     ORDER BY al.created_at DESC
     LIMIT $5`,
    [
      orgId,
      filters.status ?? null,
      filters.ruleId ?? null,
      filters.cursor ?? null,
      filters.limit,
    ],
  );
  return result.rows;
}

/**
 * Aggregate stats for an org: event totals, action success rate, and top 5 rules.
 */
export async function getOrgStats(orgId: string): Promise<OrgStats> {
  const result = await query<{
    total_events: string;
    total_actions_fired: string;
    success_count: string;
    top_rules: string | null;
  }>(
    `WITH event_stats AS (
       SELECT COUNT(*) AS total_events
       FROM events
       WHERE org_id = $1
     ),
     action_stats AS (
       SELECT
         COUNT(*)                                    AS total_actions,
         COUNT(*) FILTER (WHERE status = 'success') AS success_count
       FROM action_logs
       WHERE org_id = $1
     ),
     top_rules AS (
       SELECT
         r.id, r.name, r.action_type, r.event_type,
         COUNT(al.id) AS fire_count
       FROM rules r
       LEFT JOIN action_logs al ON al.rule_id = r.id AND al.org_id = $1
       WHERE r.org_id = $1
       GROUP BY r.id, r.name, r.action_type, r.event_type
       ORDER BY fire_count DESC
       LIMIT 5
     )
     SELECT
       (SELECT total_events  FROM event_stats)::text  AS total_events,
       (SELECT total_actions FROM action_stats)::text AS total_actions_fired,
       (SELECT success_count FROM action_stats)::text AS success_count,
       (SELECT json_agg(top_rules) FROM top_rules)::text AS top_rules`,
    [orgId],
  );

  const row = result.rows[0];
  const totalFired = Number(row?.total_actions_fired ?? 0);
  const successCount = Number(row?.success_count ?? 0);

  return {
    total_events: Number(row?.total_events ?? 0),
    total_actions_fired: totalFired,
    success_rate:
      totalFired > 0 ? Math.round((successCount / totalFired) * 10000) / 100 : 0,
    top_rules: row?.top_rules ? (JSON.parse(row.top_rules) as OrgStats['top_rules']) : [],
  };
}

/**
 * Action log history for a specific rule, ordered by most-recently-executed first.
 */
export async function getRuleLogs(
  orgId: string,
  ruleId: string,
  limit: number,
): Promise<ActionLog[]> {
  const result = await query<ActionLog>(
    `SELECT
       id, event_id, rule_id, org_id, status, attempt_count,
       error_message, response_body, executed_at, created_at, updated_at
     FROM action_logs
     WHERE rule_id = $1 AND org_id = $2
     ORDER BY executed_at DESC NULLS LAST, created_at DESC
     LIMIT $3`,
    [ruleId, orgId, limit],
  );
  return result.rows;
}
