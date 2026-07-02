UPDATE auth_identities
SET provider_user_id = '+254700000001'
WHERE provider = 'phone_pin' AND provider_user_id = '+256700000001';

UPDATE users
SET phone = '+254700000001', country = 'KE', updated_at = NOW()
WHERE phone = '+256700000001';

UPDATE saccos
SET country = 'KE', updated_at = NOW()
WHERE code = 'DEMO01';
