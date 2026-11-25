-- PP-186: small server-side key/value settings (first use: receipt AI provider choice).
-- No row = code default (Ollama). Safe to apply before the code ships.

CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_by TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
