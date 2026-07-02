-- SACCO-owned mobile money accounts and inbound payment event log

CREATE TABLE sacco_payment_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL CHECK (provider IN ('mtn_momo', 'airtel_money')),
    phone_number VARCHAR(20) NOT NULL,
    account_name VARCHAR(255),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (sacco_id, provider)
);

CREATE INDEX idx_sacco_payment_accounts_sacco_id ON sacco_payment_accounts(sacco_id);
CREATE INDEX idx_sacco_payment_accounts_phone ON sacco_payment_accounts(phone_number);

CREATE TABLE inbound_payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sacco_id UUID REFERENCES saccos(id) ON DELETE SET NULL,
    provider VARCHAR(32) NOT NULL,
    external_id VARCHAR(128) NOT NULL,
    payer_phone VARCHAR(20),
    payee_phone VARCHAR(20),
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'UGX',
    reference_text TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'matched', 'unmatched', 'failed')),
    membership_id UUID REFERENCES sacco_memberships(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    raw_payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, external_id)
);

CREATE INDEX idx_inbound_payment_events_sacco_id ON inbound_payment_events(sacco_id);
CREATE INDEX idx_inbound_payment_events_status ON inbound_payment_events(status);
