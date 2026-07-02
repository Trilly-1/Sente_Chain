-- Loans: products, applications, amortization schedule

CREATE TABLE loan_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    interest_rate_annual NUMERIC(8, 4) NOT NULL CHECK (interest_rate_annual >= 0),
    interest_method VARCHAR(32) NOT NULL CHECK (interest_method IN ('flat', 'reducing_balance')),
    min_term_months INT NOT NULL DEFAULT 1 CHECK (min_term_months >= 1),
    max_term_months INT NOT NULL DEFAULT 36 CHECK (max_term_months >= 1),
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loan_products_sacco_id ON loan_products(sacco_id);

CREATE TABLE loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sacco_id UUID NOT NULL REFERENCES saccos(id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES sacco_memberships(id) ON DELETE CASCADE,
    loan_product_id UUID REFERENCES loan_products(id) ON DELETE SET NULL,
    reference_number VARCHAR(64) NOT NULL UNIQUE,
    principal NUMERIC(18, 2) NOT NULL CHECK (principal > 0),
    term_months INT NOT NULL CHECK (term_months >= 1),
    interest_rate_annual NUMERIC(8, 4) NOT NULL CHECK (interest_rate_annual >= 0),
    interest_method VARCHAR(32) NOT NULL CHECK (interest_method IN ('flat', 'reducing_balance')),
    purpose TEXT,
    collateral TEXT,
    guarantor TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'completed', 'rejected', 'cancelled')),
    monthly_installment NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_interest NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_repayable NUMERIC(18, 2) NOT NULL DEFAULT 0,
    balance_remaining NUMERIC(18, 2) NOT NULL DEFAULT 0,
    principal_paid NUMERIC(18, 2) NOT NULL DEFAULT 0,
    interest_paid NUMERIC(18, 2) NOT NULL DEFAULT 0,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    disbursed_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    disbursement_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_loans_sacco_id ON loans(sacco_id);
CREATE INDEX idx_loans_membership_id ON loans(membership_id);
CREATE INDEX idx_loans_status ON loans(status);

CREATE TABLE loan_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    installment_number INT NOT NULL CHECK (installment_number >= 1),
    due_date DATE NOT NULL,
    principal_due NUMERIC(18, 2) NOT NULL DEFAULT 0,
    interest_due NUMERIC(18, 2) NOT NULL DEFAULT 0,
    total_due NUMERIC(18, 2) NOT NULL DEFAULT 0,
    principal_paid NUMERIC(18, 2) NOT NULL DEFAULT 0,
    interest_paid NUMERIC(18, 2) NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'paid', 'overdue', 'partial')),
    paid_at TIMESTAMPTZ,
    repayment_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (loan_id, installment_number)
);

CREATE INDEX idx_loan_installments_loan_id ON loan_installments(loan_id);
