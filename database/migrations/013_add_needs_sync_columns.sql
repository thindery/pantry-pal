-- Migration: Add needs_sync columns to existing product_cache table (Postgres)
-- Ticket: PP-039 (ported from REMY-295 / backend-legacy migration 013)
-- Purpose: Background sync queue for stale or failed barcode lookups

ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS needs_sync INTEGER DEFAULT 0;
ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS sync_retry_count INTEGER DEFAULT 0;
ALTER TABLE product_cache ADD COLUMN IF NOT EXISTS last_error TEXT;

CREATE INDEX IF NOT EXISTS idx_product_cache_needs_sync ON product_cache(needs_sync) WHERE needs_sync = 1;