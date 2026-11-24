-- Migration: Keep activity history when a pantry item is removed (PP-163)
-- Safe/idempotent: drops and re-creates the activities FK with ON DELETE SET NULL,
-- adds item_barcode snapshot column with backfill, and allows DELETE activity type.

DO $$
DECLARE
    fk_name TEXT;
    type_check_name TEXT;
BEGIN
    -- Find the existing activities item_id FK (name may vary by how it was created)
    SELECT con.conname INTO fk_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_class frel ON frel.oid = con.confrelid
    WHERE rel.relname = 'activities'
      AND con.contype = 'f'
      AND frel.relname = 'pantry_items';

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE activities DROP CONSTRAINT %I', fk_name);
    END IF;

    -- Re-add FK with ON DELETE SET NULL so deleting an item preserves its history
    ALTER TABLE activities
        ADD CONSTRAINT activities_item_id_fkey
        FOREIGN KEY (item_id) REFERENCES pantry_items(id) ON DELETE SET NULL;

    -- Find the existing type check constraint
    SELECT con.conname INTO type_check_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'activities'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%type%'
    LIMIT 1;

    IF type_check_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE activities DROP CONSTRAINT %I', type_check_name);
    END IF;
END $$;

-- Add barcode snapshot column and backfill from current pantry_items rows
ALTER TABLE activities ADD COLUMN IF NOT EXISTS item_barcode TEXT NULL;

UPDATE activities a
SET item_barcode = p.barcode
FROM pantry_items p
WHERE a.item_id = p.id
  AND a.item_barcode IS NULL
  AND p.barcode IS NOT NULL;

-- Add the DELETE activity type to the check constraint
ALTER TABLE activities ADD CONSTRAINT activities_type_check
    CHECK (type IN ('ADD','REMOVE','ADJUST','SHOPPING_SESSION','DELETE'));

-- Optional: record the DELETE type description only if activity_types table exists
DO $$
BEGIN
    IF to_regclass('public.activity_types') IS NOT NULL THEN
        INSERT INTO activity_types (type, description)
        VALUES ('DELETE', 'Item removed from pantry')
        ON CONFLICT (type) DO NOTHING;
    END IF;
END $$;
