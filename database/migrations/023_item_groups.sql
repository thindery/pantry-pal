CREATE TABLE IF NOT EXISTS item_groups (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    target_quantity REAL NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_item_groups_user_id ON item_groups(user_id);
ALTER TABLE pantry_items
    ADD COLUMN IF NOT EXISTS group_id TEXT NULL REFERENCES item_groups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_pantry_items_group_id ON pantry_items(group_id);
