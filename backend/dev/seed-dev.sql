-- =============================================================================
-- ALIGN QMS — Development Seed Data
-- =============================================================================
-- PURPOSE:
--   Creates a deterministic local development E2E dataset.
--   Provides an organization, location, service, queue, counter, 
--   and identities for STAFF and DISPLAY to test realtime flows.
--
-- IDEMPOTENCY:
--   Uses fixed UUIDs. Previous records are deleted before insertion to ensure
--   safe repeated execution without duplication.
--
-- CREDENTIALS:
--   Passwords are 'e2e-password' (BCrypt hashed). Do not use in production.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. CLEANUP (Idempotency)
-- -----------------------------------------------------------------------------
-- Deleting the organization cascades to locations, services, queues, counters,
-- and users. We also explicitly delete users by ID just in case.

DELETE FROM users WHERE id IN (
    'e2e00000-0000-0000-0000-000000000006', -- STAFF
    'e2e00000-0000-0000-0000-000000000007'  -- DISPLAY
);

DELETE FROM organizations WHERE id = 'e2e00000-0000-0000-0000-000000000001';

-- -----------------------------------------------------------------------------
-- 2. ORGANIZATION
-- -----------------------------------------------------------------------------
INSERT INTO organizations (id, code, name, sector, status, contact_email)
VALUES (
    'e2e00000-0000-0000-0000-000000000001',
    'ORG-E2E',
    'ALIGN E2E Demo',
    'Technology',
    'ACTIVE',
    'admin@align.local'
);

-- -----------------------------------------------------------------------------
-- 3. LOCATION
-- -----------------------------------------------------------------------------
INSERT INTO locations (id, org_id, name, subtitle, address, city, status, operating_hours, is_hq)
VALUES (
    'e2e00000-0000-0000-0000-000000000002',
    'e2e00000-0000-0000-0000-000000000001',
    'E2E Main Location',
    'Test Facility',
    '123 Localhost Ave',
    'Dev City',
    'ACTIVE',
    '09:00 AM - 05:00 PM',
    TRUE
);

-- -----------------------------------------------------------------------------
-- 4. SERVICE
-- -----------------------------------------------------------------------------
INSERT INTO services (id, org_id, location_id, name, description, icon, enabled, is_fast_track)
VALUES (
    'e2e00000-0000-0000-0000-000000000003',
    'e2e00000-0000-0000-0000-000000000001',
    'e2e00000-0000-0000-0000-000000000002',
    'E2E General Service',
    'Standard service for end-to-end testing',
    'info',
    TRUE,
    FALSE
);

-- -----------------------------------------------------------------------------
-- 5. QUEUE
-- -----------------------------------------------------------------------------
INSERT INTO queues (id, org_id, location_id, service_id, name, token_prefix, status, max_capacity, next_token_number)
VALUES (
    'e2e00000-0000-0000-0000-000000000004',
    'e2e00000-0000-0000-0000-000000000001',
    'e2e00000-0000-0000-0000-000000000002',
    'e2e00000-0000-0000-0000-000000000003',
    'E2E General Queue',
    'E',
    'ACTIVE',
    100,
    1
);

-- -----------------------------------------------------------------------------
-- 6. USERS
-- -----------------------------------------------------------------------------
-- Password for all E2E users is: e2e-password
-- Hash generated via bcrypt (strength 12)

-- STAFF User
INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status)
VALUES (
    'e2e00000-0000-0000-0000-000000000006',
    'e2e00000-0000-0000-0000-000000000001',
    'e2e00000-0000-0000-0000-000000000002',
    'e2e.staff@align.local',
    '$2a$12$nTNHFRy3bYimBZaBG2V72./Bhe3AUNd5t5I0zedWae96Yt7zFVyFa',
    'E2E Staff',
    'STAFF',
    'ACTIVE'
);

-- DISPLAY User
INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status)
VALUES (
    'e2e00000-0000-0000-0000-000000000007',
    'e2e00000-0000-0000-0000-000000000001',
    'e2e00000-0000-0000-0000-000000000002',
    'e2e.display@align.local',
    '$2a$12$nTNHFRy3bYimBZaBG2V72./Bhe3AUNd5t5I0zedWae96Yt7zFVyFa',
    'E2E Display',
    'DISPLAY',
    'ACTIVE'
);

-- -----------------------------------------------------------------------------
-- 7. COUNTER
-- -----------------------------------------------------------------------------
-- Counter assigned to the STAFF user
INSERT INTO counters (id, org_id, location_id, number, name, status, availability, assigned_staff_id)
VALUES (
    'e2e00000-0000-0000-0000-000000000005',
    'e2e00000-0000-0000-0000-000000000001',
    'e2e00000-0000-0000-0000-000000000002',
    1,
    'Counter 1',
    'ACTIVE',
    'ONLINE',
    'e2e00000-0000-0000-0000-000000000006'
);
