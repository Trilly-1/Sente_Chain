-- Align dev seed data with Uganda-first defaults (safe for DBs that ran older 000003)

UPDATE saccos
SET country = 'UG', updated_at = NOW()
WHERE code = 'DEMO01';

UPDATE users
SET phone = '+256700000001', country = 'UG', updated_at = NOW()
WHERE phone = '+254700000001';

UPDATE auth_identities
SET provider_user_id = '+256700000001'
WHERE provider = 'phone_pin' AND provider_user_id = '+254700000001';
