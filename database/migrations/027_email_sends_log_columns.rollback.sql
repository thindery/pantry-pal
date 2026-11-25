-- Rollback for PP-123: revert email_sends log columns and indexes.

DROP INDEX IF EXISTS idx_email_sends_status_created_at;
DROP INDEX IF EXISTS idx_email_sends_resend_id;

ALTER TABLE email_sends DROP CONSTRAINT IF EXISTS chk_email_sends_status;

ALTER TABLE email_sends
    DROP COLUMN IF EXISTS to_email,
    DROP COLUMN IF EXISTS subject,
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS error_message,
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS opened_at,
    DROP COLUMN IF EXISTS clicked_at;
