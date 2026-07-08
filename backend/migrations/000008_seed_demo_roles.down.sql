DELETE FROM sacco_memberships
WHERE user_id IN (
    SELECT id FROM users
    WHERE phone IN ('+256700000002', '+256700000003', '+256700000004')
);

DELETE FROM auth_identities
WHERE provider = 'phone_pin'
  AND provider_user_id IN ('+256700000002', '+256700000003', '+256700000004');

DELETE FROM users
WHERE phone IN ('+256700000002', '+256700000003', '+256700000004');
