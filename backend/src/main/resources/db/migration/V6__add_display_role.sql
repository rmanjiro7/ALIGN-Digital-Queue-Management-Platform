-- =============================================================================
-- V6__add_display_role.sql
-- Phase 5 Gate 2A Remediation — Support Public Display Identity
-- =============================================================================

-- Drop the existing role and org_scope constraints added in V2__security.sql
ALTER TABLE users DROP CONSTRAINT chk_user_role;
ALTER TABLE users DROP CONSTRAINT chk_user_org_scope;

-- Recreate chk_user_role including the new DISPLAY role
ALTER TABLE users ADD CONSTRAINT chk_user_role 
    CHECK (role IN ('STAFF', 'ORG_ADMIN', 'PLATFORM_ADMIN', 'DISPLAY'));

-- Recreate chk_user_org_scope allowing DISPLAY to have an org_id
-- PLATFORM_ADMIN: org_id IS NULL
-- STAFF / ORG_ADMIN / DISPLAY: org_id IS NOT NULL
ALTER TABLE users ADD CONSTRAINT chk_user_org_scope
    CHECK (
        (role = 'PLATFORM_ADMIN' AND org_id IS NULL)
        OR
        (role IN ('STAFF', 'ORG_ADMIN', 'DISPLAY') AND org_id IS NOT NULL)
    );

-- Update schema_info
INSERT INTO schema_info (key, value) VALUES
    ('phase', '5 — Gate 2A')
ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = NOW();

INSERT INTO schema_info (key, value) VALUES
    ('display_role_migration', 'V6__add_display_role.sql — added DISPLAY role constraints')
ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = NOW();
