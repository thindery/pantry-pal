-- PP-183: AI recipe builder metering and guardrails.
-- 032 because PP-186 (receipt AI provider) reserves 031_app_settings. Renumber only if that changes.
--
-- llm_usage: one row per provider attempt. A row is inserted as 'reserved' with the
-- estimated max tokens BEFORE the call (so concurrent requests can't both slip under
-- a cap), then updated with the real prompt/completion counts after it.
CREATE TABLE IF NOT EXISTS llm_usage (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    feature TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'reserved',
    reserved_tokens INTEGER NOT NULL DEFAULT 0,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_user_created ON llm_usage(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_usage_created ON llm_usage(created_at);

-- Small key/value state for the AI guard (auto-trip pause). Separate from PP-186's app_settings.
CREATE TABLE IF NOT EXISTS ai_guard_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 24h cache of identical requests (same user, pantry snapshot and options) so repeats cost nothing.
CREATE TABLE IF NOT EXISTS ai_response_cache (
    cache_key TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    feature TEXT NOT NULL,
    response JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_response_cache_created ON ai_response_cache(created_at);
