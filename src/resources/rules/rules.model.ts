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

export async function getActiveRules(orgId: string, eventType: string): Promise<Rule[]> {
  const result = await query<Rule>(
    `SELECT id, org_id, name, event_type, condition, action_type, action_config, is_active, created_at, updated_at
     FROM rules
     WHERE org_id = $1 AND event_type = $2 AND is_active = true`,
    [orgId, eventType],
  );
  return result.rows;
}
