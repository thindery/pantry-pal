-- Rollback for PP-165: drop login_events.method and users.created_at.

ALTER TABLE login_events DROP COLUMN IF EXISTS method;
ALTER TABLE users DROP COLUMN IF EXISTS created_at;
