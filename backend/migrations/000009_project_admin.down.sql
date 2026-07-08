DELETE FROM auth_identities
WHERE provider = 'phone_pin' AND provider_user_id = '+256764331334';

DELETE FROM users WHERE phone = '+256764331334';
