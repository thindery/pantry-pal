-- Rollback for PP-183: drop AI metering tables.

DROP TABLE IF EXISTS ai_response_cache;
DROP TABLE IF EXISTS ai_guard_state;
DROP TABLE IF EXISTS llm_usage;
