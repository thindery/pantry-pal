-- Migration: Mark whether a saved recipe has imported/entered details
-- Link-only imports (blocked site or no Recipe JSON-LD) are saved with is_complete = FALSE.
ALTER TABLE recipes
    ADD COLUMN IF NOT EXISTS is_complete BOOLEAN NOT NULL DEFAULT TRUE;
