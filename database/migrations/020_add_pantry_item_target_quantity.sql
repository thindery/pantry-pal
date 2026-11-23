-- PP-156: Add target_quantity to pantry_items for per-item target overrides
ALTER TABLE pantry_items
    ADD COLUMN IF NOT EXISTS target_quantity REAL NULL;
