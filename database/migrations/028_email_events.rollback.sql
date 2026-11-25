-- Rollback for PP-124: drop email_suppressions and email_events.

DROP TABLE IF EXISTS email_suppressions;
DROP TABLE IF EXISTS email_events;
