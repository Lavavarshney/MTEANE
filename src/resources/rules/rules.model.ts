import { query } from '../../shared/db';

export interface Rule {
  id: string;
  org_id: string;
  name: string;
  event_type: string;
  condition: Record<string, unknown>;
  action_type: 'webhook' | 'email' | 'slack';
  action_config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRuleInput {
  name: string;
  event_type: string;
  condition: Record<string, unknown>;
  action_type: Rule['action_type'];
  action_config: Record<string, unknown>;
}

export interface UpdateRuleInput {
  name?: string;
  condition?: Record<string, unknown>;
  action_config?: Record<string, unknown>;
  is_active?: boolean;
}

export async function getActiveRules(orgId: string, eventType: string): Promise<Rule[]> {
  const result = await query<Rule>(
    `SELECT id, org_id, name, event_type, condition, action_type, action_config, is_active, created_at, updated_at
     FROM rules
     WHERE org_id = $1 AND event_type = $2 AND is_active = true`,
    [orgId, eventType],
  );
  return result.rows;
}

export async function createRule(orgId: string, input: CreateRuleInput): Promise<Rule> {
  const result = await query<Rule>(
    `INSERT INTO rules (org_id, name, event_type, condition, action_type, action_config)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb)
     RETURNING id, org_id, name, event_type, condition, action_type, action_config, is_active, created_at, updated_at`,
    [
      orgId,
      input.name,
      input.event_type,
      JSON.stringify(input.condition),
      input.action_type,
      JSON.stringify(input.action_config),
    ],
  );

  if (!result.rows[0]) {
    throw new Error('Failed to create rule');
  }

  return result.rows[0];
}

export async function listRulesByOrg(orgId: string): Promise<Rule[]> {
  const result = await query<Rule>(
    `SELECT id, org_id, name, event_type, condition, action_type, action_config, is_active, created_at, updated_at
     FROM rules
     WHERE org_id = $1
     ORDER BY created_at DESC`,
    [orgId],
  );
  return result.rows;
}

export async function findRuleById(orgId: string, ruleId: string): Promise<Rule | null> {
  const result = await query<Rule>(
    `SELECT id, org_id, name, event_type, condition, action_type, action_config, is_active, created_at, updated_at
     FROM rules
     WHERE org_id = $1 AND id = $2
     LIMIT 1`,
    [orgId, ruleId],
  );
  return result.rows[0] ?? null;
}

export async function updateRule(
  orgId: string,
  ruleId: string,
  patch: UpdateRuleInput,
): Promise<Rule | null> {
  const result = await query<Rule>(
    `UPDATE rules
     SET
       name = COALESCE($3, name),
       condition = COALESCE($4::jsonb, condition),
       action_config = COALESCE($5::jsonb, action_config),
       is_active = COALESCE($6, is_active),
       updated_at = CURRENT_TIMESTAMP
     WHERE org_id = $1 AND id = $2
     RETURNING id, org_id, name, event_type, condition, action_type, action_config, is_active, created_at, updated_at`,
    [
      orgId,
      ruleId,
      patch.name ?? null,
      patch.condition ? JSON.stringify(patch.condition) : null,
      patch.action_config ? JSON.stringify(patch.action_config) : null,
      patch.is_active ?? null,
    ],
  );

  return result.rows[0] ?? null;
}

export async function softDeleteRule(orgId: string, ruleId: string): Promise<Rule | null> {
  const result = await query<Rule>(
    `UPDATE rules
     SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE org_id = $1 AND id = $2
     RETURNING id, org_id, name, event_type, condition, action_type, action_config, is_active, created_at, updated_at`,
    [orgId, ruleId],
  );

  return result.rows[0] ?? null;
}

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

export async function createActionLog(
  eventId: string,
  ruleId: string,
  orgId: string,
  status: ActionLog['status'],
): Promise<ActionLog> {
  const result = await query<ActionLog>(
    `INSERT INTO action_logs (event_id, rule_id, org_id, status)
     VALUES ($1, $2, $3, $4)
     RETURNING id, event_id, rule_id, org_id, status, attempt_count, error_message, response_body, executed_at, created_at, updated_at`,
    [eventId, ruleId, orgId, status],
  );

  if (!result.rows[0]) {
    throw new Error('Failed to create action log');
  }

  return result.rows[0];
}
