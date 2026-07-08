-- Platform admin from PROJECT_ADMIN_* (default: +256764331334 / PIN 0909)
-- PIN hash for 0909 (bcrypt cost 10)

INSERT INTO users (full_name, phone, country, pin_hash, is_project_admin)
VALUES (
    'SenteChain Admin',
    '+256764331334',
    'UG',
    '$2a$10$QiVfRiHFu/XG6La1fXR1/eKpdcROWFyYurSaPd2w07Huo7JSZL/I.',
    true
)
ON CONFLICT (phone) DO UPDATE
    SET is_project_admin = true,
        pin_hash = EXCLUDED.pin_hash,
        full_name = EXCLUDED.full_name,
        country = EXCLUDED.country,
        updated_at = NOW();

INSERT INTO auth_identities (user_id, provider, provider_user_id)
SELECT id, 'phone_pin', '+256764331334'
FROM users
WHERE phone = '+256764331334'
ON CONFLICT (provider, provider_user_id) DO NOTHING;
