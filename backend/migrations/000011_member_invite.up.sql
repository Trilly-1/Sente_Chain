-- Allow invite links that are separate from SACCO-founder email verification.

ALTER TABLE email_tokens DROP CONSTRAINT IF EXISTS email_tokens_token_type_check;

ALTER TABLE email_tokens
    ADD CONSTRAINT email_tokens_token_type_check
    CHECK (token_type IN ('email_verification', 'pin_reset', 'member_invite'));
