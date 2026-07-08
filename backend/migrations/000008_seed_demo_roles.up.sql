-- Expand local demo accounts for FE/BE role testing (idempotent)
-- PIN for all: 1234
-- Hash: $2a$10$jTEsgJ2faqm2UtWu.ZX8le6IFUV0HnIR8TOTlkIxcl65FHMY9Glke

INSERT INTO saccos (name, code, status, country, profile)
VALUES ('Demo SACCO', 'DEMO01', 'approved', 'UG', '{}')
ON CONFLICT (code) DO UPDATE
    SET status = 'approved', country = 'UG', updated_at = NOW();

INSERT INTO users (full_name, phone, country, pin_hash, is_project_admin)
VALUES (
    'Demo SACCO Admin',
    '+256700000002',
    'UG',
    '$2a$10$jTEsgJ2faqm2UtWu.ZX8le6IFUV0HnIR8TOTlkIxcl65FHMY9Glke',
    false
)
ON CONFLICT (phone) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        country = EXCLUDED.country,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

INSERT INTO auth_identities (user_id, provider, provider_user_id)
SELECT id, 'phone_pin', '+256700000002'
FROM users WHERE phone = '+256700000002'
ON CONFLICT (provider, provider_user_id) DO NOTHING;

INSERT INTO sacco_memberships (user_id, sacco_id, role, status, joined_at)
SELECT u.id, s.id, 'admin', 'active', NOW()
FROM users u CROSS JOIN saccos s
WHERE u.phone = '+256700000002' AND s.code = 'DEMO01'
  AND NOT EXISTS (
      SELECT 1 FROM sacco_memberships m WHERE m.user_id = u.id AND m.sacco_id = s.id
  );

UPDATE sacco_memberships m
SET role = 'admin', status = 'active', joined_at = COALESCE(m.joined_at, NOW()), updated_at = NOW()
FROM users u, saccos s
WHERE m.user_id = u.id AND m.sacco_id = s.id
  AND u.phone = '+256700000002' AND s.code = 'DEMO01';

INSERT INTO users (full_name, phone, country, pin_hash, is_project_admin)
VALUES (
    'Demo Cashier',
    '+256700000003',
    'UG',
    '$2a$10$jTEsgJ2faqm2UtWu.ZX8le6IFUV0HnIR8TOTlkIxcl65FHMY9Glke',
    false
)
ON CONFLICT (phone) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        country = EXCLUDED.country,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

INSERT INTO auth_identities (user_id, provider, provider_user_id)
SELECT id, 'phone_pin', '+256700000003'
FROM users WHERE phone = '+256700000003'
ON CONFLICT (provider, provider_user_id) DO NOTHING;

INSERT INTO sacco_memberships (user_id, sacco_id, role, status, joined_at)
SELECT u.id, s.id, 'cashier', 'active', NOW()
FROM users u CROSS JOIN saccos s
WHERE u.phone = '+256700000003' AND s.code = 'DEMO01'
  AND NOT EXISTS (
      SELECT 1 FROM sacco_memberships m WHERE m.user_id = u.id AND m.sacco_id = s.id
  );

UPDATE sacco_memberships m
SET role = 'cashier', status = 'active', joined_at = COALESCE(m.joined_at, NOW()), updated_at = NOW()
FROM users u, saccos s
WHERE m.user_id = u.id AND m.sacco_id = s.id
  AND u.phone = '+256700000003' AND s.code = 'DEMO01';

INSERT INTO users (full_name, phone, country, pin_hash, is_project_admin)
VALUES (
    'Demo Member',
    '+256700000004',
    'UG',
    '$2a$10$jTEsgJ2faqm2UtWu.ZX8le6IFUV0HnIR8TOTlkIxcl65FHMY9Glke',
    false
)
ON CONFLICT (phone) DO UPDATE
    SET pin_hash = EXCLUDED.pin_hash,
        country = EXCLUDED.country,
        full_name = EXCLUDED.full_name,
        updated_at = NOW();

INSERT INTO auth_identities (user_id, provider, provider_user_id)
SELECT id, 'phone_pin', '+256700000004'
FROM users WHERE phone = '+256700000004'
ON CONFLICT (provider, provider_user_id) DO NOTHING;

INSERT INTO sacco_memberships (user_id, sacco_id, role, status, joined_at)
SELECT u.id, s.id, 'member', 'active', NOW()
FROM users u CROSS JOIN saccos s
WHERE u.phone = '+256700000004' AND s.code = 'DEMO01'
  AND NOT EXISTS (
      SELECT 1 FROM sacco_memberships m WHERE m.user_id = u.id AND m.sacco_id = s.id
  );

UPDATE sacco_memberships m
SET role = 'member', status = 'active', joined_at = COALESCE(m.joined_at, NOW()), updated_at = NOW()
FROM users u, saccos s
WHERE m.user_id = u.id AND m.sacco_id = s.id
  AND u.phone = '+256700000004' AND s.code = 'DEMO01';
