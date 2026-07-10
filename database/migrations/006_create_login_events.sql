-- Migration: Login events for DAU tracking (Postgres)

CREATE TABLE IF NOT EXISTS login_events (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    source TEXT DEFAULT 'api',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_login_events_user_id ON login_events(user_id);
CREATE INDEX IF NOT EXISTS idx_login_events_created_at ON login_events(created_at DESC);