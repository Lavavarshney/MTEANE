-- Migration 002: Create api_keys table
-- Stores hashed API keys for authentication
-- Never stores plaintext keys

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index on org and active status for quick auth lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_org_active 
  ON api_keys(org_id, is_active) 
  WHERE is_active = true;

-- Index on key_hash for authentication
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
