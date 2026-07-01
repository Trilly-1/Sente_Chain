-- Dev seed data for manual API testing (idempotent)

INSERT INTO saccos (name, code, status, country, profile)
VALUES ('Demo SACCO', 'DEMO01', 'approved', 'KE', '{}')
ON CONFLICT (code) DO UPDATE
    SET status = 'approved', country = 'KE', updated_at = NOW();

INSERT INTO users (full_name, phone, country, pin_hash, is_project_admin)
VALUES (
    'Project Admin',
    '+254700000001',
    'KE',
    '$2a$10$jTEsgJ2faqm2UtWu.ZX8le6IFUV0HnIR8TOTlkIxcl65FHMY9Glke',
    true
)
ON CONFLICT (phone) DO UPDATE
    SET is_project_admin = true,
        pin_hash = EXCLUDED.pin_hash,
        country = EXCLUDED.country,
        updated_at = NOW();

INSERT INTO auth_identities (user_id, provider, provider_user_id)
SELECT id, 'phone_pin', '+254700000001'
FROM users
WHERE phone = '+254700000001'
ON CONFLICT (provider, provider_user_id) DO NOTHING;
