-- Financial transactions (operational records in PostgreSQL)

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_number VARCHAR(64) NOT NULL UNIQUE,
    sacco_id UUID NOT NULL REFERENCES saccos(id),
    membership_id UUID NOT NULL REFERENCES sacco_memberships(id),
    initiated_by UUID NOT NULL REFERENCES users(id),
    transaction_type VARCHAR(50) NOT NULL,
    amount NUMERIC(18, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'recorded',
    proof_hash VARCHAR(128),
    stellar_tx_hash VARCHAR(128),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (transaction_type IN ('deposit', 'withdrawal', 'loan_disbursement', 'loan_repayment', 'transfer', 'fee', 'other')),
    CHECK (status IN ('recorded', 'anchor_pending', 'blockchain_verified', 'anchor_failed', 'cancelled')),
    CHECK (char_length(currency) = 3)
);

CREATE INDEX idx_transactions_sacco_id ON transactions(sacco_id);
CREATE INDEX idx_transactions_membership_id ON transactions(membership_id);
CREATE INDEX idx_transactions_initiated_by ON transactions(initiated_by);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_reference_number ON transactions(reference_number);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
