-- PP-123: Extend email_sends to log every attempt and exclude backfills.

ALTER TABLE email_sends
    ADD COLUMN IF NOT EXISTS to_email TEXT,
    ADD COLUMN IF NOT EXISTS subject TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'sent',
    ADD COLUMN IF NOT EXISTS error_message TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now(),
    ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

-- Ensure check constraint on status values
ALTER TABLE email_sends DROP CONSTRAINT IF EXISTS chk_email_sends_status;
ALTER TABLE email_sends
    ADD CONSTRAINT chk_email_sends_status
    CHECK (status IN ('pending', 'sent', 'failed', 'backfill', 'delivered', 'bounced', 'complained'));

-- Backfill: existing rows with resend_id IS NULL and template='welcome' -> status='backfill'; other existing rows -> 'sent'
UPDATE email_sends
SET status = 'backfill'
WHERE resend_id IS NULL AND template = 'welcome' AND status != 'backfill';

-- Indexes for status queries and resend_id lookup
CREATE INDEX IF NOT EXISTS idx_email_sends_status_created_at ON email_sends(status, created_at);
CREATE INDEX IF NOT EXISTS idx_email_sends_resend_id ON email_sends(resend_id);
