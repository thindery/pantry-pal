-- Rollback for PP-163: keep activity history on remove.
-- Note: DELETE activities only exist after the forward migration ran, so removing
-- them here is the intended rollback behavior.

DELETE FROM activities WHERE type = 'DELETE';

DO $$
DECLARE
    fk_name TEXT;
    type_check_name TEXT;
BEGIN
    -- Drop the SET NULL FK and restore CASCADE
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

    ALTER TABLE activities
        ADD CONSTRAINT activities_item_id_fkey
        FOREIGN KEY (item_id) REFERENCES pantry_items(id) ON DELETE CASCADE;

    -- Restore the 4-value type check
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

    ALTER TABLE activities ADD CONSTRAINT activities_type_check
        CHECK (type IN ('ADD','REMOVE','ADJUST','SHOPPING_SESSION'));
END $$;

ALTER TABLE activities DROP COLUMN IF EXISTS item_barcode;
