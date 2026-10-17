-- Update standard role accounts with clean emails and distinct passwords

-- 1. Staff (email: staff@align.local, password: Staff@1234)
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
) ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = EXCLUDED.role, status = EXCLUDED.status;

-- 2. Org Admin (email: admin@align.local, password: Admin@1234)
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
) ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = EXCLUDED.role, status = EXCLUDED.status;

-- 3. Platform Admin (email: platform@align.local, password: Platform@1234)
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
) ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = EXCLUDED.role, status = EXCLUDED.status;
