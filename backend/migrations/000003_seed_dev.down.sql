DELETE FROM auth_identities
WHERE provider = 'phone_pin' AND provider_user_id = '+254700000001';

DELETE FROM users WHERE phone = '+254700000001';

DELETE FROM saccos WHERE code = 'DEMO01';
