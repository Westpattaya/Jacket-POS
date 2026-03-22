-- Track time spent in each queue phase for analytics and kitchen display
-- Run in Supabase SQL Editor if you already ran the initial migration

ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparing_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Index for querying orders by phase duration (e.g. orders waiting too long in preparing)
CREATE INDEX IF NOT EXISTS idx_orders_preparing_at ON orders (preparing_at) WHERE preparing_at IS NOT NULL;
