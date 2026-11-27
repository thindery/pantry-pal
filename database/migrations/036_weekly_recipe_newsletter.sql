-- PP-235: weekly recipe newsletter. No mail is sent by this migration.

-- One row per weekly issue. The issue is built as a draft, a [TEST] copy goes to the owner, and it only
-- reaches the list after an admin approves it (or EMAIL_WEEKLY_AUTO_SEND is switched on).
CREATE TABLE IF NOT EXISTS email_weekly_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_key TEXT NOT NULL UNIQUE,            -- ISO week of the build day, e.g. 2026-W48
    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'approved', 'sending', 'sent', 'skipped')),
    subject TEXT NOT NULL,
    preheader TEXT NOT NULL,
    content JSONB NOT NULL,                    -- {"recipes": [{slug, title, blurb}], "tip": {id, title, body}}
    recipe_slugs TEXT[] NOT NULL,
    tip_id TEXT NOT NULL,
    test_sent_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by TEXT,                          -- admin user id, or 'auto'
    send_started_at TIMESTAMPTZ,
    send_completed_at TIMESTAMPTZ,
    recipients_total INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_weekly_issues_created ON email_weekly_issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_weekly_issues_status ON email_weekly_issues(status);

-- App users opt in to the weekly recipe email (default off; never opted in by migration).
ALTER TABLE email_preferences
    ADD COLUMN IF NOT EXISTS weekly_recipes BOOLEAN NOT NULL DEFAULT FALSE;
