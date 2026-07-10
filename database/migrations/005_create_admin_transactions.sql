-- Migration: Admin transactions table (Postgres)

CREATE TABLE IF NOT EXISTS admin_transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_invoice_id TEXT,
    amount_cents INTEGER NOT NULL DEFAULT 0,
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL CHECK(status IN ('succeeded', 'failed', 'pending', 'refunded')),
    tier TEXT,
    billing_interval TEXT,
    failure_code TEXT,
    failure_message TEXT,
    stripe_event_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_transactions_user_id ON admin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_transactions_status ON admin_transactions(status);
CREATE INDEX IF NOT EXISTS idx_admin_transactions_created_at ON admin_transactions(created_at DESC);