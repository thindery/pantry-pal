-- PP-194..PP-198: email journeys foundation. No mail is sent by this migration.

-- Classify sends so the dashboard and the send gate can tell them apart.
ALTER TABLE email_sends
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'transactional',
    ADD COLUMN IF NOT EXISTS journey TEXT,
    ADD COLUMN IF NOT EXISTS journey_step TEXT;
CREATE INDEX IF NOT EXISTS idx_email_sends_journey ON email_sends(journey) WHERE journey IS NOT NULL;

-- Recipe newsletter: double opt-in state. Existing capture-only rows stay 'pending'
-- (they never confirmed) and are NOT mailed unless Tylor approves a backlog confirm.
ALTER TABLE recipe_newsletter_subscribers
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS confirm_token TEXT,
    ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT,
    ADD COLUMN IF NOT EXISTS confirmation_sent_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

UPDATE recipe_newsletter_subscribers
SET status = 'unsubscribed'
WHERE unsubscribed_at IS NOT NULL AND status = 'pending';

UPDATE recipe_newsletter_subscribers
SET confirm_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE confirm_token IS NULL;
UPDATE recipe_newsletter_subscribers
SET unsubscribe_token = replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
WHERE unsubscribe_token IS NULL;

ALTER TABLE recipe_newsletter_subscribers
    ALTER COLUMN confirm_token SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
    ALTER COLUMN unsubscribe_token SET DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
ALTER TABLE recipe_newsletter_subscribers
    ALTER COLUMN confirm_token SET NOT NULL,
    ALTER COLUMN unsubscribe_token SET NOT NULL;
ALTER TABLE recipe_newsletter_subscribers DROP CONSTRAINT IF EXISTS chk_recipe_newsletter_status;
ALTER TABLE recipe_newsletter_subscribers
    ADD CONSTRAINT chk_recipe_newsletter_status CHECK (status IN ('pending', 'confirmed', 'unsubscribed'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_newsletter_confirm_token ON recipe_newsletter_subscribers(confirm_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_newsletter_unsub_token ON recipe_newsletter_subscribers(unsubscribe_token);
CREATE INDEX IF NOT EXISTS idx_recipe_newsletter_status ON recipe_newsletter_subscribers(status, created_at);

-- App users: onboarding tips preference (default on, one click off).
ALTER TABLE email_preferences
    ADD COLUMN IF NOT EXISTS onboarding_tips BOOLEAN NOT NULL DEFAULT TRUE;

-- List history so the dashboard can chart subscribers over time without guessing.
CREATE TABLE IF NOT EXISTS email_list_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list TEXT NOT NULL,
    event TEXT NOT NULL CHECK (event IN ('subscribed', 'confirmed', 'unsubscribed', 'resubscribed')),
    subject_ref TEXT,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_list_events_list_time ON email_list_events(list, created_at);

INSERT INTO email_list_events (list, event, subject_ref, source, created_at)
SELECT 'recipes', 'subscribed', id::text, source, consented_at FROM recipe_newsletter_subscribers;
INSERT INTO email_list_events (list, event, subject_ref, source, created_at)
SELECT 'recipes', 'unsubscribed', id::text, source, unsubscribed_at
FROM recipe_newsletter_subscribers WHERE unsubscribed_at IS NOT NULL;

-- Per-subject journey progress (one row per journey and person).
CREATE TABLE IF NOT EXISTS email_journey_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey TEXT NOT NULL,
    subject_type TEXT NOT NULL CHECK (subject_type IN ('subscriber', 'user')),
    subject_id TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'stopped')),
    next_step INTEGER NOT NULL DEFAULT 0,
    anchor_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    next_run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_sent_at TIMESTAMPTZ,
    stopped_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT email_journey_state_unique UNIQUE (journey, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_email_journey_state_due ON email_journey_state(status, next_run_at);

-- First-party link clicks (works even when Resend click tracking is off).
CREATE TABLE IF NOT EXISTS email_clicks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_send_id TEXT NOT NULL,
    link_label TEXT NOT NULL,
    path TEXT NOT NULL,
    is_bot BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_clicks_send ON email_clicks(email_send_id);
CREATE INDEX IF NOT EXISTS idx_email_clicks_time ON email_clicks(created_at);
