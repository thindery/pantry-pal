-- PP-179: Favorite stores per ZIP code on weekly ads hub

CREATE TABLE IF NOT EXISTS weekly_ad_store_favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    zip TEXT NOT NULL,
    store_id TEXT NOT NULL REFERENCES weekly_ad_stores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, zip, store_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_ad_store_favorites_user_zip ON weekly_ad_store_favorites (user_id, zip);
