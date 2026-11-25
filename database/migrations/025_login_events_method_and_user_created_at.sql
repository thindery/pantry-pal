-- PP-165: record login method and a signup timestamp on users.
-- login_events already exists (006) but had no method column and nothing wrote rows.
-- users (014 NextAuth) had no created_at; new rows get NOW() via the default.
-- Existing users.created_at values will be the time this migration runs.

ALTER TABLE login_events
    ADD COLUMN IF NOT EXISTS method TEXT;

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
