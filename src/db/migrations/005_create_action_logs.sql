-- Migration 004: Create action_logs table
-- Tracks execution state of rule actions for each event

CREATE TABLE IF NOT EXISTS action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'retrying', 'dead')),
  attempt_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  response_body TEXT,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (event_id, rule_id)
);

-- Index on org and event for quick lookup
CREATE INDEX IF NOT EXISTS idx_action_logs_org_event
  ON action_logs(org_id, event_id);

-- Index on status for filtering pending/failed
CREATE INDEX IF NOT EXISTS idx_action_logs_status
  ON action_logs(status)
  WHERE status IN ('pending', 'retrying');

-- Index on rule_id for audit trails
CREATE INDEX IF NOT EXISTS idx_action_logs_rule
  ON action_logs(rule_id);
