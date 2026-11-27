-- Rollback for PP-235.
ALTER TABLE email_preferences DROP COLUMN IF EXISTS weekly_recipes;
DROP TABLE IF EXISTS email_weekly_issues;
