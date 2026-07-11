-- Sliding-window rate limit events (PP-052; portfolio rate_limiting playbook)
CREATE TABLE IF NOT EXISTS rate_limit_events (
    identifier TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_lookup
    ON rate_limit_events (identifier, endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_cleanup
    ON rate_limit_events (created_at);