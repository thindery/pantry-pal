-- PP-166: first-month offer tagging and comp (100% discount) exclusion for admin stats.
-- Additive and idempotent. Safe to run before or after the code deploys.

ALTER TABLE admin_transactions ADD COLUMN IF NOT EXISTS offer TEXT NULL;
ALTER TABLE admin_transactions ADD COLUMN IF NOT EXISTS is_comp BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: a succeeded invoice that charged nothing is a comp / fully discounted invoice.
UPDATE admin_transactions
SET is_comp = TRUE
WHERE status = 'succeeded' AND amount_cents = 0 AND is_comp = FALSE;

CREATE INDEX IF NOT EXISTS idx_admin_transactions_offer ON admin_transactions(offer) WHERE offer IS NOT NULL;
