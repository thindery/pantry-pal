DROP INDEX IF EXISTS idx_pantry_items_group_id;
ALTER TABLE pantry_items DROP COLUMN IF EXISTS group_id;
DROP INDEX IF EXISTS idx_item_groups_user_id;
DROP TABLE IF EXISTS item_groups;
