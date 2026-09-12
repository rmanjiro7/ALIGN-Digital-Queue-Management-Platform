-- =============================================================================
-- V2__security.sql
-- ALIGN QMS — Phase 1 Security Migration
-- =============================================================================
-- Creates:
--   1. organizations  — minimal stub required as FK target for users.org_id
--                       Phase 2 will add all organization domain columns via
--                       ALTER TABLE (no re-creation needed). See ADR-013.
--   2. users          — system users (STAFF, ORG_ADMIN, PLATFORM_ADMIN)
--   3. refresh_tokens — server-side refresh token persistence (SHA-256 hash)
--
-- IMPORTANT: CUSTOMER role is anonymous — not stored in users table.
-- org_id is nullable for PLATFORM_ADMIN (no tenant scope).
-- email is GLOBALLY unique (not per-org).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. organizations (STUB — Phase 1 FK target only)
-- -----------------------------------------------------------------------------
-- Phase 2 will expand this with: name, code, sector, status, contact_email,
-- joined_date, created_at, updated_at via ALTER TABLE statements.
-- Do NOT add domain columns here; that is Phase 2 scope.
-- -----------------------------------------------------------------------------
CREATE TABLE organizations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE organizations IS
    'Phase 1 stub — FK anchor for users.org_id. '
    'Phase 2 adds all domain columns. Do not use for business logic in Phase 1.';

-- -----------------------------------------------------------------------------
-- 2. users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID        REFERENCES organizations(id) ON DELETE CASCADE,
    email                   VARCHAR(255) UNIQUE NOT NULL,
    password_hash           VARCHAR(255) NOT NULL,
    name                    VARCHAR(255) NOT NULL,
    role                    VARCHAR(50)  NOT NULL,
    status                  VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    location_id             UUID,           -- FK to locations; added as FK in Phase 2
    assigned_counter_number INT,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_user_role   CHECK (role   IN ('STAFF', 'ORG_ADMIN', 'PLATFORM_ADMIN')),
    CONSTRAINT chk_user_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- PLATFORM_ADMIN rule: org_id must be NULL when role = PLATFORM_ADMIN.
-- STAFF / ORG_ADMIN rule: org_id must be non-NULL.
ALTER TABLE users ADD CONSTRAINT chk_user_org_scope
    CHECK (
        (role = 'PLATFORM_ADMIN' AND org_id IS NULL)
        OR
        (role IN ('STAFF', 'ORG_ADMIN') AND org_id IS NOT NULL)
    );

-- Index: email lookup (login)
CREATE INDEX idx_users_email ON users(email);

-- Index: list users by org (Phase 2 staff management)
CREATE INDEX idx_users_org ON users(org_id) WHERE org_id IS NOT NULL;

-- Index: list by org + role (e.g. list org staff)
CREATE INDEX idx_users_org_role ON users(org_id, role) WHERE org_id IS NOT NULL;

-- Index: active users only (common filter)
CREATE INDEX idx_users_status ON users(status);

COMMENT ON TABLE  users                     IS 'System users: STAFF, ORG_ADMIN, PLATFORM_ADMIN. CUSTOMER is anonymous.';
COMMENT ON COLUMN users.org_id              IS 'NULL only for PLATFORM_ADMIN. All other roles must have an org.';
COMMENT ON COLUMN users.password_hash       IS 'BCrypt hash (strength 12). Never store or return plaintext.';
COMMENT ON COLUMN users.location_id         IS 'FK to locations — FK constraint added in Phase 2 migration.';
COMMENT ON COLUMN users.assigned_counter_number IS 'Counter number assignment for STAFF role.';

-- -----------------------------------------------------------------------------
-- 3. refresh_tokens
-- -----------------------------------------------------------------------------
-- ADR-011: The token column stores a SHA-256 hex digest of the plaintext
-- refresh token. The plaintext token is returned to the client at login/refresh
-- and is never stored. Lookup is O(1) via the unique index on the hash.
-- Rotation: old token row deleted on every successful refresh.
-- Revocation: row deleted on logout or when reuse is detected.
-- -----------------------------------------------------------------------------
CREATE TABLE refresh_tokens (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64)  NOT NULL,   -- SHA-256 hex (64 chars)
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
);

-- Index: lookup by user (list / revoke all tokens for a user)
CREATE INDEX idx_refresh_tokens_user    ON refresh_tokens(user_id);

-- Index: cleanup job for expired tokens
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);

COMMENT ON TABLE  refresh_tokens            IS 'Server-side refresh token store. Stores SHA-256 hash, not plaintext.';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA-256 hex of the plaintext token returned to client (ADR-011).';

-- -----------------------------------------------------------------------------
-- Update schema_info
-- -----------------------------------------------------------------------------
INSERT INTO schema_info (key, value) VALUES
    ('phase', '1 — Security')
ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = NOW();

INSERT INTO schema_info (key, value) VALUES
    ('security_migration', 'V2__security.sql — users, organizations stub, refresh_tokens')
ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = NOW();
