-- Migration 003: Create events table
-- Stores incoming event data

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key TEXT,
  status TEXT DEFAULT 'received',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index on org and event_type for rule matching
CREATE INDEX IF NOT EXISTS idx_events_org_type 
  ON events(org_id, event_type);

-- Unique index on idempotency key for deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_idempotency 
  ON events(org_id, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_events_created_at 
  ON events(org_id, created_at DESC);
