-- Rollback for PP-166. Drops offer tagging and comp flags (stats only; no billing data lost).

DROP INDEX IF EXISTS idx_admin_transactions_offer;
ALTER TABLE admin_transactions DROP COLUMN IF EXISTS is_comp;
ALTER TABLE admin_transactions DROP COLUMN IF EXISTS offer;
