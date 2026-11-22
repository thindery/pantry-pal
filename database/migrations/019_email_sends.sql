-- PP-096–PP-100: Idempotent transactional email log.
CREATE TABLE IF NOT EXISTS email_sends (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    template TEXT NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    resend_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_sends_user_id ON email_sends(user_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_template ON email_sends(template);

-- Existing accounts should not receive a welcome email when mail is later enabled.
INSERT INTO email_sends (id, user_id, template, idempotency_key)
SELECT
    'welcome-backfill-' || u.id::text,
    u.id::text,
    'welcome',
    'welcome:' || u.id::text
FROM users u
ON CONFLICT (idempotency_key) DO NOTHING;
