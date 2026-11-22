-- PP-093: Track cancel-at-period-end without dropping Pro early.
ALTER TABLE user_subscriptions
    ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;
