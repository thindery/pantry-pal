-- Rollback for PP-194..PP-198.
DROP TABLE IF EXISTS email_clicks;
DROP TABLE IF EXISTS email_journey_state;
DROP TABLE IF EXISTS email_list_events;
ALTER TABLE email_preferences DROP COLUMN IF EXISTS onboarding_tips;
DROP INDEX IF EXISTS idx_recipe_newsletter_status;
DROP INDEX IF EXISTS idx_recipe_newsletter_unsub_token;
DROP INDEX IF EXISTS idx_recipe_newsletter_confirm_token;
ALTER TABLE recipe_newsletter_subscribers DROP CONSTRAINT IF EXISTS chk_recipe_newsletter_status;
ALTER TABLE recipe_newsletter_subscribers
    DROP COLUMN IF EXISTS confirmed_at,
    DROP COLUMN IF EXISTS confirmation_sent_at,
    DROP COLUMN IF EXISTS unsubscribe_token,
    DROP COLUMN IF EXISTS confirm_token,
    DROP COLUMN IF EXISTS status;
DROP INDEX IF EXISTS idx_email_sends_journey;
ALTER TABLE email_sends DROP COLUMN IF EXISTS journey_step, DROP COLUMN IF EXISTS journey, DROP COLUMN IF EXISTS category;
