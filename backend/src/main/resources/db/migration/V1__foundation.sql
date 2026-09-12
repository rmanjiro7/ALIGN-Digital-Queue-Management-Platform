-- =============================================================================
-- V1__foundation.sql
-- ALIGN QMS — Phase 0 Foundation Migration
-- =============================================================================
-- Purpose:
--   Establishes the Flyway baseline and verifies that PostgreSQL is correctly
--   connected and the migration system is functioning. No domain tables are
--   created in Phase 0.
--
-- Domain schema created in later phases:
--   V2__security.sql          → users, refresh_tokens           (Phase 1)
--   V3__organization.sql      → organizations, locations        (Phase 2)
--   V4__services_queues.sql   → services, queues, counters      (Phase 2)
--   V5__token_engine.sql      → tokens, token_events            (Phase 3)
--   V6__audit.sql             → audit_logs                      (Phase 6)
-- =============================================================================

-- Verify PostgreSQL version meets the minimum requirement (15+)
DO $$
DECLARE
    pg_major INT;
BEGIN
    pg_major := current_setting('server_version_num')::INT / 10000;
    IF pg_major < 15 THEN
        RAISE EXCEPTION
            'ALIGN requires PostgreSQL 15 or higher. Current version: %',
            current_setting('server_version');
    END IF;
END;
$$;

-- Create a schema_info table to hold application metadata.
-- This is separate from flyway_schema_history and owned by the application.
CREATE TABLE IF NOT EXISTS schema_info (
    key   VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO schema_info (key, value) VALUES
    ('app_name',       'ALIGN Digital Queue Management Platform'),
    ('schema_version', '1'),
    ('phase',          '0 — Foundation'),
    ('created_at',     NOW()::TEXT)
ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = NOW();
