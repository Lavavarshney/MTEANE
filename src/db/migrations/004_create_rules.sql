CREATE TABLE rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  condition JSONB NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('webhook', 'email', 'slack')),
  action_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Partial index: only active rules, keeps it lean as rules scale
CREATE INDEX idx_rules_org_event ON rules(org_id, event_type) WHERE is_active = true;
