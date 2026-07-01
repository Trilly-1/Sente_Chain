DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS documents;

ALTER TABLE auth_identities DROP CONSTRAINT IF EXISTS auth_identities_provider_check;
ALTER TABLE auth_identities ADD CONSTRAINT auth_identities_provider_check
    CHECK (provider IN ('phone_otp', 'google', 'sep10'));

ALTER TABLE sacco_memberships DROP CONSTRAINT IF EXISTS sacco_memberships_status_check;
UPDATE sacco_memberships SET status = 'pending' WHERE status = 'pending_kyc';
ALTER TABLE sacco_memberships ADD CONSTRAINT sacco_memberships_status_check
    CHECK (status IN ('pending', 'active', 'suspended'));
ALTER TABLE sacco_memberships ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE saccos DROP CONSTRAINT IF EXISTS saccos_status_check;
ALTER TABLE saccos DROP COLUMN IF EXISTS profile;
ALTER TABLE saccos DROP COLUMN IF EXISTS created_by;
ALTER TABLE saccos DROP COLUMN IF EXISTS country;
ALTER TABLE saccos DROP COLUMN IF EXISTS status;

ALTER TABLE users DROP COLUMN IF EXISTS is_project_admin;
ALTER TABLE users DROP COLUMN IF EXISTS pin_hash;
ALTER TABLE users DROP COLUMN IF EXISTS country;
