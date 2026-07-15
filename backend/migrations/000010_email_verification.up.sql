-- Email verification and PIN reset tokens (Brevo transactional emails)

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Existing accounts without email are treated as verified
UPDATE users SET email_verified_at = NOW() WHERE email IS NULL AND email_verified_at IS NULL;

CREATE TABLE email_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    token_type VARCHAR(50) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (token_type IN ('email_verification', 'pin_reset'))
);

CREATE INDEX idx_email_tokens_user_id ON email_tokens(user_id);
CREATE INDEX idx_email_tokens_expires_at ON email_tokens(expires_at);
CREATE INDEX idx_email_tokens_type ON email_tokens(token_type);
