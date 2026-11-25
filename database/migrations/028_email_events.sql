-- PP-124: Resend webhook events and email suppressions.

CREATE TABLE IF NOT EXISTS email_events (
    id TEXT PRIMARY KEY,
    resend_id TEXT,
    email_send_id TEXT,
    event_type TEXT NOT NULL,
    occurred_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_email_events_resend_id ON email_events(resend_id);

CREATE TABLE IF NOT EXISTS email_suppressions (
    email TEXT PRIMARY KEY,
    reason TEXT NOT NULL CHECK (reason IN ('complained', 'bounced')),
    source_event_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
