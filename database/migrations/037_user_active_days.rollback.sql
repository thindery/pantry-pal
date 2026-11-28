-- Rollback for PP-244.
DROP TABLE IF EXISTS user_active_days;
ALTER TABLE users DROP COLUMN IF EXISTS created_at_estimated;
