-- =============================================================================
-- V3__organization_domain.sql
-- ALIGN QMS — Phase 2 Organization Domain Migration
-- =============================================================================
-- Expands the organizations stub created in V2 and creates the full
-- Phase 2 hierarchy:
--
--   organizations  (expanded from stub)
--       └── locations
--             └── services
--                   └── queues
--   locations
--       └── counters
--
-- NOTE: The organizations table already exists (V2 stub with id + created_at).
--       We expand it with ALTER TABLE statements only. Do NOT re-create it.
--       Doing so would break the existing FK from users.org_id → organizations.id.
--
-- IMPORTANT:
--   - next_token_number on queues is the Phase 3 atomic counter. It is
--     created here (schema must be complete) but is NOT used by Phase 2 logic.
--   - Token tables (tokens, token_events) are Phase 3 — NOT created here.
--   - Audit log table is Phase 6 — NOT created here.
--   - No PostgreSQL sequences for token numbering.
--   - No RLS — tenant isolation is application-level.
-- =============================================================================


-- =============================================================================
-- 1. EXPAND organizations (stub → full domain table)
-- =============================================================================
-- All columns added with DEFAULT / nullable to avoid constraint issues
-- on the existing (empty) stub rows.

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS code          VARCHAR(20)  UNIQUE,
    ADD COLUMN IF NOT EXISTS name          VARCHAR(255),
    ADD COLUMN IF NOT EXISTS sector        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS joined_date   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enforce status values
ALTER TABLE organizations
    ADD CONSTRAINT chk_org_status CHECK (status IN ('ACTIVE', 'SUSPENDED'));

-- Make name NOT NULL now that the column exists (stub table was empty so safe)
ALTER TABLE organizations ALTER COLUMN name SET NOT NULL;

-- Make code NOT NULL now that the column exists
ALTER TABLE organizations ALTER COLUMN code SET NOT NULL;

-- Enforce unique organization code
-- (The ADD COLUMN ... UNIQUE above creates an unnamed constraint; this named
--  one replaces it with a predictable name for tests and error handling.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'organizations'
          AND constraint_name = 'uq_organizations_code'
    ) THEN
        ALTER TABLE organizations
            ADD CONSTRAINT uq_organizations_code UNIQUE (code);
    END IF;
END;
$$;

-- Index on status for platform-admin list queries
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

COMMENT ON TABLE  organizations               IS 'Multi-tenant organization registry. One row = one tenant.';
COMMENT ON COLUMN organizations.code          IS 'Human-readable tenant identifier, e.g. T-8492. Globally unique.';
COMMENT ON COLUMN organizations.status        IS 'ACTIVE or SUSPENDED. Suspended orgs cannot log in.';
COMMENT ON COLUMN organizations.sector        IS 'Industry classification: Healthcare, Government, Education, etc.';


-- =============================================================================
-- 2. locations
-- =============================================================================

CREATE TABLE locations (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name             VARCHAR(255) NOT NULL,
    subtitle         VARCHAR(255),
    address          TEXT,
    city             VARCHAR(100),
    status           VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    operating_hours  VARCHAR(100),
    is_hq            BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT chk_location_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

-- Tenant-scoped lookups
CREATE INDEX idx_locations_org        ON locations(org_id);
CREATE INDEX idx_locations_org_status ON locations(org_id, status);

COMMENT ON TABLE  locations            IS 'Physical branch / office locations belonging to an organization.';
COMMENT ON COLUMN locations.is_hq      IS 'TRUE if this is the headquarters / main branch.';
COMMENT ON COLUMN locations.operating_hours IS 'Human-readable hours, e.g. "08:00 AM - 06:00 PM".';


-- =============================================================================
-- 3. Add FK from users.location_id → locations.id
-- =============================================================================
-- V2 added location_id as a plain UUID column with a comment noting the FK
-- would be added in Phase 2. We add it now.

ALTER TABLE users
    ADD CONSTRAINT fk_users_location
        FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL;


-- =============================================================================
-- 4. services
-- =============================================================================

CREATE TABLE services (
    id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id               UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id          UUID         NOT NULL REFERENCES locations(id)     ON DELETE CASCADE,
    name                 VARCHAR(255) NOT NULL,
    description          TEXT,
    icon                 VARCHAR(50),
    enabled              BOOLEAN      NOT NULL DEFAULT TRUE,
    is_fast_track        BOOLEAN      NOT NULL DEFAULT FALSE,
    preparation_guidance TEXT,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lookups by location (customer discovery)
CREATE INDEX idx_services_location             ON services(location_id);
-- Org-scoped queries (admin)
CREATE INDEX idx_services_org_location_enabled ON services(org_id, location_id, enabled);

COMMENT ON TABLE  services                   IS 'Service offerings at each location.';
COMMENT ON COLUMN services.is_fast_track     IS 'Priority / express service flag.';
COMMENT ON COLUMN services.preparation_guidance IS 'Customer instructions, e.g. "Bring government ID".';


-- =============================================================================
-- 5. queues
-- =============================================================================
-- One queue per service (UNIQUE constraint on service_id).
-- next_token_number is the Phase 3 atomic counter — present in schema,
-- not used by Phase 2 application logic.

CREATE TABLE queues (
    id                      UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                  UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id             UUID         NOT NULL REFERENCES locations(id)     ON DELETE CASCADE,
    service_id              UUID         NOT NULL REFERENCES services(id)      ON DELETE CASCADE,
    name                    VARCHAR(255) NOT NULL,
    token_prefix            VARCHAR(5)   NOT NULL DEFAULT 'A',
    status                  VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    max_capacity            INT          NOT NULL DEFAULT 100,
    auto_pause_at_capacity  BOOLEAN      NOT NULL DEFAULT FALSE,
    next_token_number       BIGINT       NOT NULL DEFAULT 1,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_queue_service          UNIQUE (service_id),
    CONSTRAINT chk_queue_status          CHECK  (status IN ('ACTIVE', 'PAUSED', 'CLOSED')),
    CONSTRAINT chk_next_token_positive   CHECK  (next_token_number >= 1),
    CONSTRAINT chk_max_capacity_positive CHECK  (max_capacity > 0)
);

CREATE INDEX idx_queues_location ON queues(location_id);
CREATE INDEX idx_queues_service  ON queues(service_id);
CREATE INDEX idx_queues_org      ON queues(org_id);
CREATE INDEX idx_queues_status   ON queues(status);

COMMENT ON TABLE  queues                   IS 'Queue configuration — one queue per service.';
COMMENT ON COLUMN queues.token_prefix      IS 'Prefix for token numbers: A → A-001, B → B-001, etc.';
COMMENT ON COLUMN queues.next_token_number IS '⭐ Phase 3 atomic counter. Incremented atomically at token issuance.';
COMMENT ON COLUMN queues.auto_pause_at_capacity IS 'If TRUE, queue auto-pauses when active tokens reach max_capacity.';


-- =============================================================================
-- 6. counters
-- =============================================================================
-- Counters belong to a location (not directly to a queue).
-- current_serving_token_id is Phase 3 — column present, always NULL in Phase 2.
-- assigned_staff_id FK to users is nullable (counter may be unassigned).

CREATE TABLE counters (
    id                        UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id                    UUID         NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id               UUID         NOT NULL REFERENCES locations(id)     ON DELETE CASCADE,
    number                    INT          NOT NULL,
    name                      VARCHAR(100),
    status                    VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    availability              VARCHAR(20)  NOT NULL DEFAULT 'OFFLINE',
    assigned_staff_id         UUID         REFERENCES users(id) ON DELETE SET NULL,
    current_serving_token_id  UUID,        -- FK to tokens added in Phase 3
    service_start_time        TIMESTAMP WITH TIME ZONE,
    created_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_counter_location_number UNIQUE (location_id, number),
    CONSTRAINT chk_counter_status         CHECK  (status       IN ('ACTIVE', 'PAUSED', 'CLOSED')),
    CONSTRAINT chk_counter_availability   CHECK  (availability IN ('ONLINE', 'ON_BREAK', 'AWAY', 'OFFLINE'))
);

CREATE INDEX idx_counters_location             ON counters(location_id);
CREATE INDEX idx_counters_org                  ON counters(org_id);
CREATE INDEX idx_counters_location_availability ON counters(location_id, availability);
CREATE INDEX idx_counters_assigned_staff       ON counters(assigned_staff_id)
    WHERE assigned_staff_id IS NOT NULL;

COMMENT ON TABLE  counters                         IS 'Service counters / stations at a location.';
COMMENT ON COLUMN counters.number                  IS 'Counter number within a location — unique per location.';
COMMENT ON COLUMN counters.availability            IS 'ONLINE | ON_BREAK | AWAY | OFFLINE (BR-003).';
COMMENT ON COLUMN counters.current_serving_token_id IS 'Phase 3: FK to tokens added in V5. NULL in Phase 2.';


-- =============================================================================
-- 7. Update schema_info
-- =============================================================================

INSERT INTO schema_info (key, value) VALUES
    ('phase', '2 — Organization Domain')
ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = NOW();

INSERT INTO schema_info (key, value) VALUES
    ('org_domain_migration', 'V3__organization_domain.sql — organizations expanded, locations, services, queues, counters')
ON CONFLICT (key) DO UPDATE
    SET value      = EXCLUDED.value,
        updated_at = NOW();
