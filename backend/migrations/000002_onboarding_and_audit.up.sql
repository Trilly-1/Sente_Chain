-- Onboarding, documents, and audit schema for SenteChain Phase 1

-- User profile fields for PIN-based auth and onboarding
ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(3);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_project_admin BOOLEAN NOT NULL DEFAULT false;

-- Expand membership status values for KYC workflow
ALTER TABLE sacco_memberships DROP CONSTRAINT IF EXISTS sacco_memberships_status_check;
UPDATE sacco_memberships SET status = 'pending_kyc' WHERE status = 'pending';
ALTER TABLE sacco_memberships ADD CONSTRAINT sacco_memberships_status_check
    CHECK (status IN ('pending_kyc', 'under_review', 'active', 'rejected', 'suspended'));
ALTER TABLE sacco_memberships ALTER COLUMN status SET DEFAULT 'pending_kyc';

-- SACCO application status for SACCO onboarding
ALTER TABLE saccos ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'draft';
ALTER TABLE saccos ADD COLUMN IF NOT EXISTS country VARCHAR(3);
ALTER TABLE saccos ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE saccos ADD COLUMN IF NOT EXISTS profile JSONB NOT NULL DEFAULT '{}';
ALTER TABLE saccos DROP CONSTRAINT IF EXISTS saccos_status_check;
ALTER TABLE saccos ADD CONSTRAINT saccos_status_check
    CHECK (status IN ('draft', 'under_review', 'approved', 'rejected', 'blocked'));

-- Allow phone_pin auth provider
ALTER TABLE auth_identities DROP CONSTRAINT IF EXISTS auth_identities_provider_check;
ALTER TABLE auth_identities ADD CONSTRAINT auth_identities_provider_check
    CHECK (provider IN ('phone_otp', 'phone_pin', 'google', 'sep10'));

-- KYC / compliance documents (metadata + file URL; no binary storage in DB)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_type VARCHAR(50) NOT NULL,
    owner_id UUID NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (owner_type IN ('membership', 'sacco'))
);

CREATE INDEX IF NOT EXISTS idx_documents_owner ON documents(owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- Immutable audit trail for admin and financial actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
