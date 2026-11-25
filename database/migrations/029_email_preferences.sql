-- PP-137: opt-in email preferences (weekly low-stock digest). Default off.

CREATE TABLE IF NOT EXISTS email_preferences (
    user_id TEXT PRIMARY KEY,
    low_stock_digest BOOLEAN NOT NULL DEFAULT FALSE,
    threshold_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    item_threshold_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
    unsubscribe_token TEXT NOT NULL UNIQUE,
    opted_in_at TIMESTAMPTZ,
    unsubscribed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_preferences_digest ON email_preferences(low_stock_digest) WHERE low_stock_digest;
