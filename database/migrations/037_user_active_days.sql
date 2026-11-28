-- PP-244: honest signup and activity numbers.
-- 1) users.created_at was added by 025 with DEFAULT NOW(), so every account that existed
--    then got the migration time, not its real signup time. Flag those rows so funnel
--    "signups in period" excludes them instead of counting them as new.
-- 2) login_events only records an actual Google sign-in; JWT sessions last 30 days, so
--    returning users rarely create a row. user_active_days records one row per user per
--    day they make any authenticated API call.

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_at_estimated BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET created_at_estimated = TRUE
WHERE created_at <= (
    SELECT (applied_at AT TIME ZONE 'UTC') + INTERVAL '1 second'
    FROM schema_migrations
    WHERE version = '025_login_events_method_and_user_created_at'
);

CREATE TABLE IF NOT EXISTS user_active_days (
    user_id TEXT NOT NULL,
    day DATE NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, day)
);

CREATE INDEX IF NOT EXISTS idx_user_active_days_day ON user_active_days (day);
