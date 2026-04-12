-- Migration 006: Add observability indexes
-- Supports efficient queries for GET /logs (filter by org+status) and
-- GET /rules/:id/logs (rule-specific log history ordered by execution time)

CREATE INDEX IF NOT EXISTS idx_action_logs_org_status
  ON action_logs(org_id, status);

CREATE INDEX IF NOT EXISTS idx_action_logs_rule_executed
  ON action_logs(rule_id, executed_at DESC NULLS LAST);
