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
    'e2e00000-0000-0000-0000-000000000007', -- DISPLAY
    'e2e00000-0000-0000-0000-000000000008', -- ADMIN
    'e2e00000-0000-0000-0000-000000000009'  -- PLATFORM
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

-- Dedicated Role Users with Distinct Passwords:
-- 1. STAFF: staff@align.local / Staff@1234
-- 2. ORG_ADMIN: admin@align.local / Admin@1234
-- 3. PLATFORM_ADMIN: platform@align.local / Platform@1234
INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status)
VALUES (
    'a1190000-0000-0000-0000-000000000006',
    'e2e00000-0000-0000-0000-000000000001',
    'e2e00000-0000-0000-0000-000000000002',
    'staff@align.local',
    '$2a$12$LeeLLtfdMidjNFFAhWI0CeDWYGdPyNPAJXtC0SZh2YdgWNNUvm8l6',
    'Staff Operator',
    'STAFF',
    'ACTIVE'
);

INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status)
VALUES (
    'a1190000-0000-0000-0000-000000000008',
    'e2e00000-0000-0000-0000-000000000001',
    'e2e00000-0000-0000-0000-000000000002',
    'admin@align.local',
    '$2a$12$P.QU3HdpUfCc7dgqfDXice3AHv9x4vCX94LbqrrkAiHS46QrTaj72',
    'Organization Admin',
    'ORG_ADMIN',
    'ACTIVE'
);

INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status)
VALUES (
    'a1190000-0000-0000-0000-000000000009',
    NULL,
    NULL,
    'platform@align.local',
    '$2a$12$QJ4Rxuhb3HA8Q4/zduKib.TXRQ9uRTQ/SyqfIIBlP0rjZekmd5SGS',
    'Platform Admin',
    'PLATFORM_ADMIN',
    'ACTIVE'
);

-- Legacy E2E Test Fixture Accounts (password: e2e-password)
-- ORG_ADMIN User
INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status)
VALUES (
    'e2e00000-0000-0000-0000-000000000008',
    'e2e00000-0000-0000-0000-000000000001',
    'e2e00000-0000-0000-0000-000000000002',
    'e2e.admin@align.local',
    '$2a$12$nTNHFRy3bYimBZaBG2V72./Bhe3AUNd5t5I0zedWae96Yt7zFVyFa',
    'E2E Admin',
    'ORG_ADMIN',
    'ACTIVE'
);

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

-- PLATFORM_ADMIN User
INSERT INTO users (id, org_id, location_id, email, password_hash, name, role, status)
VALUES (
    'e2e00000-0000-0000-0000-000000000009',
    NULL,
    NULL,
    'e2e.platform@align.local',
    '$2a$12$nTNHFRy3bYimBZaBG2V72./Bhe3AUNd5t5I0zedWae96Yt7zFVyFa',
    'E2E Platform Admin',
    'PLATFORM_ADMIN',
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

INSERT INTO services (id, org_id, location_id, name, description, icon, enabled, is_fast_track)
VALUES (
    'e2e00000-0000-0000-0000-000000000010',
    'e2e00000-0000-0000-0000-000000000001',
    'e2e00000-0000-0000-0000-000000000002',
    'E2E Specialist Service',
    'Specialist service for transfer testing',
    'star',
    TRUE,
    FALSE
);

INSERT INTO queues (id, org_id, location_id, service_id, name, token_prefix, status, max_capacity, next_token_number)
VALUES (
    'e2e00000-0000-0000-0000-000000000011',
    'e2e00000-0000-0000-0000-000000000001',
    'e2e00000-0000-0000-0000-000000000002',
    'e2e00000-0000-0000-0000-000000000010',
    'E2E Specialist Queue',
    'S',
    'ACTIVE',
    100,
    1
);

INSERT INTO counters (id, org_id, location_id, number, name, status, availability, assigned_staff_id)
VALUES (
    'e2e00000-0000-0000-0000-000000000012',
    'e2e00000-0000-0000-0000-000000000001',
    'e2e00000-0000-0000-0000-000000000002',
    2,
    'Counter 2',
    'ACTIVE',
    'ONLINE',
    'e2e00000-0000-0000-0000-000000000006'
);

-- -----------------------------------------------------------------------------
-- 8. COUNTER SERVICE ASSIGNMENTS
-- -----------------------------------------------------------------------------
INSERT INTO counter_service_assignments (id, counter_id, service_id)
VALUES (
    'e2e00000-0000-0000-0000-000000000013',
    'e2e00000-0000-0000-0000-000000000005', -- Counter 1
    'e2e00000-0000-0000-0000-000000000003'  -- Service A
);

INSERT INTO counter_service_assignments (id, counter_id, service_id)
VALUES (
    'e2e00000-0000-0000-0000-000000000014',
    'e2e00000-0000-0000-0000-000000000012', -- Counter 2
    'e2e00000-0000-0000-0000-000000000010'  -- Service B
);
