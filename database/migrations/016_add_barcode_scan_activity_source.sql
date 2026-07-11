-- Migration: Allow BARCODE_SCAN as activity source (barcode add-to-inventory flow)

DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    SELECT con.conname INTO constraint_name
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'activities'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%source%'
    LIMIT 1;

    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE activities DROP CONSTRAINT %I', constraint_name);
    END IF;
END $$;

ALTER TABLE activities ADD CONSTRAINT activities_source_check
    CHECK (source IN (
        'MANUAL',
        'RECEIPT_SCAN',
        'VISUAL_USAGE',
        'SHOPPING_SESSION',
        'BARCODE_SCAN'
    ));