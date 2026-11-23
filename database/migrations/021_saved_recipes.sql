-- Migration: Saved recipes table (Postgres)
CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    source_url TEXT NULL,
    image_url TEXT NULL,
    servings TEXT NULL,
    ingredients JSONB NOT NULL,
    instructions JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
