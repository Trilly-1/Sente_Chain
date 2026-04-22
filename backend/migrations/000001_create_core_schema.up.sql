-- Create core schema for SenteChain
-- Tables: users, saccos, sacco_memberships, otp_codes, auth_identities

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    google_id VARCHAR(255) UNIQUE,
    stellar_public_key VARCHAR(56),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- SACCOs table
CREATE TABLE saccos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_saccos_code ON saccos(code);

-- SACCO Memberships table
CREATE TABLE sacco_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    joined_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, sacco_id),
    CHECK (role IN ('member', 'cashier', 'admin')),
    CHECK (status IN ('pending', 'active', 'suspended'))
);

CREATE INDEX idx_sacco_memberships_user_id ON sacco_memberships(user_id);
CREATE INDEX idx_sacco_memberships_sacco_id ON sacco_memberships(sacco_id);
CREATE INDEX idx_sacco_memberships_status ON sacco_memberships(status);

-- OTP Codes table
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_codes_phone ON otp_codes(phone);
CREATE INDEX idx_otp_codes_expires_at ON otp_codes(expires_at);

-- Auth Identities table
CREATE TABLE auth_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_user_id),
    CHECK (provider IN ('phone_otp', 'google', 'sep10'))
);

CREATE INDEX idx_auth_identities_user_id ON auth_identities(user_id);
CREATE INDEX idx_auth_identities_provider ON auth_identities(provider);
