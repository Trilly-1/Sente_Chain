package loans

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

const productColumns = `id, sacco_id, name, interest_rate_annual, interest_method, min_term_months, max_term_months, is_default, is_active, created_at, updated_at`
const loanColumns = `id, sacco_id, membership_id, loan_product_id, reference_number, principal, term_months, interest_rate_annual, interest_method, purpose, collateral, guarantor, status, monthly_installment, total_interest, total_repayable, balance_remaining, principal_paid, interest_paid, applied_at, approved_at, disbursed_at, rejected_at, completed_at, approved_by, disbursement_transaction_id, created_at, updated_at`
const installmentColumns = `id, loan_id, installment_number, due_date, principal_due, interest_due, total_due, principal_paid, interest_paid, status, paid_at, repayment_transaction_id, created_at, updated_at`

func scanProduct(row pgx.Row) (*LoanProduct, error) {
	p := &LoanProduct{}
	var rate string
	err := row.Scan(&p.ID, &p.SaccoID, &p.Name, &rate, &p.InterestMethod, &p.MinTermMonths, &p.MaxTermMonths, &p.IsDefault, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}
	p.InterestRateAnnual = rate
	return p, nil
}

func scanLoan(row pgx.Row) (*Loan, error) {
	l := &Loan{}
	var principal, monthly, totalInt, totalRep, balance, principalPaid, interestPaid, rate string
	err := row.Scan(
		&l.ID, &l.SaccoID, &l.MembershipID, &l.LoanProductID, &l.ReferenceNumber,
		&principal, &l.TermMonths, &rate, &l.InterestMethod, &l.Purpose, &l.Collateral, &l.Guarantor,
		&l.Status, &monthly, &totalInt, &totalRep, &balance, &principalPaid, &interestPaid,
		&l.AppliedAt, &l.ApprovedAt, &l.DisbursedAt, &l.RejectedAt, &l.CompletedAt, &l.ApprovedBy, &l.DisbursementTransactionID,
		&l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	l.Principal = principal
	l.InterestRateAnnual = rate
	l.MonthlyInstallment = monthly
	l.TotalInterest = totalInt
	l.TotalRepayable = totalRep
	l.BalanceRemaining = balance
	l.PrincipalPaid = principalPaid
	l.InterestPaid = interestPaid
	return l, nil
}

func scanInstallment(row pgx.Row) (*Installment, error) {
	inst := &Installment{}
	var principalDue, interestDue, totalDue, principalPaid, interestPaid string
	err := row.Scan(
		&inst.ID, &inst.LoanID, &inst.InstallmentNumber, &inst.DueDate,
		&principalDue, &interestDue, &totalDue, &principalPaid, &interestPaid,
		&inst.Status, &inst.PaidAt, &inst.RepaymentTransactionID, &inst.CreatedAt, &inst.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	inst.PrincipalDue = principalDue
	inst.InterestDue = interestDue
	inst.TotalDue = totalDue
	inst.PrincipalPaid = principalPaid
	inst.InterestPaid = interestPaid
	return inst, nil
}

func (r *Repository) CreateProduct(ctx context.Context, saccoID string, req *CreateProductRequest) (*LoanProduct, error) {
	if req.IsDefault {
		_, _ = r.db.Exec(ctx, `UPDATE loan_products SET is_default = false, updated_at = NOW() WHERE sacco_id = $1`, saccoID)
	}
	q := `INSERT INTO loan_products (sacco_id, name, interest_rate_annual, interest_method, min_term_months, max_term_months, is_default)
		VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING ` + productColumns
	return scanProduct(r.db.QueryRow(ctx, q, saccoID, req.Name, req.InterestRateAnnual, req.InterestMethod, req.MinTermMonths, req.MaxTermMonths, req.IsDefault))
}

func (r *Repository) ListProducts(ctx context.Context, saccoID string, activeOnly bool) ([]*LoanProduct, error) {
	q := `SELECT ` + productColumns + ` FROM loan_products WHERE sacco_id = $1`
	if activeOnly {
		q += ` AND is_active = true`
	}
	q += ` ORDER BY is_default DESC, name ASC`
	rows, err := r.db.Query(ctx, q, saccoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*LoanProduct
	for rows.Next() {
		p, err := scanProduct(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, rows.Err()
}

func (r *Repository) GetProduct(ctx context.Context, saccoID, productID string) (*LoanProduct, error) {
	q := `SELECT ` + productColumns + ` FROM loan_products WHERE id = $1 AND sacco_id = $2`
	p, err := scanProduct(r.db.QueryRow(ctx, q, productID, saccoID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, pgx.ErrNoRows
	}
	return p, err
}

func (r *Repository) GetDefaultProduct(ctx context.Context, saccoID string) (*LoanProduct, error) {
	q := `SELECT ` + productColumns + ` FROM loan_products WHERE sacco_id = $1 AND is_default = true AND is_active = true LIMIT 1`
	p, err := scanProduct(r.db.QueryRow(ctx, q, saccoID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, pgx.ErrNoRows
	}
	return p, err
}

func (r *Repository) UpdateProduct(ctx context.Context, saccoID, productID string, req *UpdateProductRequest) (*LoanProduct, error) {
	existing, err := r.GetProduct(ctx, saccoID, productID)
	if err != nil {
		return nil, err
	}
	if req.IsDefault != nil && *req.IsDefault {
		_, _ = r.db.Exec(ctx, `UPDATE loan_products SET is_default = false, updated_at = NOW() WHERE sacco_id = $1`, saccoID)
	}
	name := existing.Name
	method := existing.InterestMethod
	minTerm := existing.MinTermMonths
	maxTerm := existing.MaxTermMonths
	isDefault := existing.IsDefault
	isActive := existing.IsActive
	rate := existing.InterestRateAnnual
	if req.Name != nil {
		name = *req.Name
	}
	if req.InterestMethod != nil {
		method = *req.InterestMethod
	}
	if req.MinTermMonths != nil {
		minTerm = *req.MinTermMonths
	}
	if req.MaxTermMonths != nil {
		maxTerm = *req.MaxTermMonths
	}
	if req.IsDefault != nil {
		isDefault = *req.IsDefault
	}
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	if req.InterestRateAnnual != nil {
		rate = FormatAmount(*req.InterestRateAnnual)
	}
	q := `UPDATE loan_products SET name=$1, interest_rate_annual=$2, interest_method=$3, min_term_months=$4, max_term_months=$5, is_default=$6, is_active=$7, updated_at=NOW()
		WHERE id=$8 AND sacco_id=$9 RETURNING ` + productColumns
	return scanProduct(r.db.QueryRow(ctx, q, name, rate, method, minTerm, maxTerm, isDefault, isActive, productID, saccoID))
}

func (r *Repository) CreateLoan(ctx context.Context, loan *Loan) (*Loan, error) {
	q := `INSERT INTO loans (
		sacco_id, membership_id, loan_product_id, reference_number, principal, term_months,
		interest_rate_annual, interest_method, purpose, collateral, guarantor, status,
		monthly_installment, total_interest, total_repayable, balance_remaining
	) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
	RETURNING ` + loanColumns
	return scanLoan(r.db.QueryRow(ctx, q,
		loan.SaccoID, loan.MembershipID, loan.LoanProductID, loan.ReferenceNumber, loan.Principal, loan.TermMonths,
		loan.InterestRateAnnual, loan.InterestMethod, loan.Purpose, loan.Collateral, loan.Guarantor, loan.Status,
		loan.MonthlyInstallment, loan.TotalInterest, loan.TotalRepayable, loan.BalanceRemaining,
	))
}

func (r *Repository) GetLoan(ctx context.Context, loanID string) (*Loan, error) {
	q := `SELECT ` + loanColumns + ` FROM loans WHERE id = $1`
	l, err := scanLoan(r.db.QueryRow(ctx, q, loanID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, pgx.ErrNoRows
	}
	return l, err
}

func (r *Repository) ListLoansBySacco(ctx context.Context, saccoID, status string) ([]*Loan, error) {
	q := `SELECT ` + loanColumns + ` FROM loans WHERE sacco_id = $1`
	args := []interface{}{saccoID}
	if status != "" {
		q += ` AND status = $2`
		args = append(args, status)
	}
	q += ` ORDER BY applied_at DESC`
	rows, err := r.db.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*Loan
	for rows.Next() {
		l, err := scanLoan(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, l)
	}
	return list, rows.Err()
}

func (r *Repository) ListLoansByMembership(ctx context.Context, membershipID string) ([]*Loan, error) {
	q := `SELECT ` + loanColumns + ` FROM loans WHERE membership_id = $1 ORDER BY applied_at DESC`
	rows, err := r.db.Query(ctx, q, membershipID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*Loan
	for rows.Next() {
		l, err := scanLoan(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, l)
	}
	return list, rows.Err()
}

func (r *Repository) UpdateLoanApproved(ctx context.Context, loanID string, approvedBy uuid.UUID, disbursementTxnID uuid.UUID, summary *AmortizationSummary) (*Loan, error) {
	now := time.Now()
	q := `UPDATE loans SET status=$1, approved_at=$2, disbursed_at=$3, approved_by=$4, disbursement_transaction_id=$5,
		monthly_installment=$6, total_interest=$7, total_repayable=$8, balance_remaining=$9, updated_at=NOW()
		WHERE id=$10 AND status='pending' RETURNING ` + loanColumns
	return scanLoan(r.db.QueryRow(ctx, q,
		StatusActive, now, now, approvedBy, disbursementTxnID,
		FormatAmount(summary.MonthlyInstallment), FormatAmount(summary.TotalInterest), FormatAmount(summary.TotalRepayable), FormatAmount(summary.TotalRepayable),
		loanID,
	))
}

func (r *Repository) UpdateLoanRejected(ctx context.Context, loanID string) (*Loan, error) {
	now := time.Now()
	q := `UPDATE loans SET status=$1, rejected_at=$2, updated_at=NOW() WHERE id=$3 AND status='pending' RETURNING ` + loanColumns
	return scanLoan(r.db.QueryRow(ctx, q, StatusRejected, now, loanID))
}

func (r *Repository) UpdateLoanRepayment(ctx context.Context, loanID string, principalPaid, interestPaid, balanceRemaining float64, completed bool) (*Loan, error) {
	status := StatusActive
	var completedAt *time.Time
	if completed {
		status = StatusCompleted
		now := time.Now()
		completedAt = &now
	}
	q := `UPDATE loans SET principal_paid = principal_paid + $1, interest_paid = interest_paid + $2,
		balance_remaining = $3, status = $4, completed_at = $5, updated_at = NOW()
		WHERE id = $6 RETURNING ` + loanColumns
	return scanLoan(r.db.QueryRow(ctx, q, FormatAmount(principalPaid), FormatAmount(interestPaid), FormatAmount(balanceRemaining), status, completedAt, loanID))
}

func (r *Repository) CreateInstallments(ctx context.Context, loanID uuid.UUID, rows []ScheduleRow) error {
	batch := &pgx.Batch{}
	for _, row := range rows {
		batch.Queue(`INSERT INTO loan_installments (loan_id, installment_number, due_date, principal_due, interest_due, total_due)
			VALUES ($1,$2,$3,$4,$5,$6)`,
			loanID, row.InstallmentNumber, row.DueDate.Format("2006-01-02"),
			FormatAmount(row.PrincipalDue), FormatAmount(row.InterestDue), FormatAmount(row.TotalDue),
		)
	}
	br := r.db.SendBatch(ctx, batch)
	defer br.Close()
	for range rows {
		if _, err := br.Exec(); err != nil {
			return err
		}
	}
	return br.Close()
}

func (r *Repository) ListInstallments(ctx context.Context, loanID string) ([]*Installment, error) {
	q := `SELECT ` + installmentColumns + ` FROM loan_installments WHERE loan_id = $1 ORDER BY installment_number ASC`
	rows, err := r.db.Query(ctx, q, loanID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*Installment
	for rows.Next() {
		inst, err := scanInstallment(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, inst)
	}
	return list, rows.Err()
}

func (r *Repository) GetNextPendingInstallment(ctx context.Context, loanID string) (*Installment, error) {
	q := `SELECT ` + installmentColumns + ` FROM loan_installments WHERE loan_id = $1 AND status IN ('pending','partial','overdue') ORDER BY installment_number ASC LIMIT 1`
	inst, err := scanInstallment(r.db.QueryRow(ctx, q, loanID))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, pgx.ErrNoRows
	}
	return inst, err
}

func (r *Repository) UpdateInstallmentPayment(ctx context.Context, installmentID string, principalPaid, interestPaid float64, status string, txnID *uuid.UUID) error {
	now := time.Now()
	var paidAt *time.Time
	if status == InstallmentPaid {
		paidAt = &now
	}
	_, err := r.db.Exec(ctx, `
		UPDATE loan_installments SET principal_paid = principal_paid + $1, interest_paid = interest_paid + $2,
			status = $3, paid_at = COALESCE(paid_at, $4), repayment_transaction_id = COALESCE(repayment_transaction_id, $5), updated_at = NOW()
		WHERE id = $6`,
		FormatAmount(principalPaid), FormatAmount(interestPaid), status, paidAt, txnID, installmentID,
	)
	return err
}

func GenerateReference() string {
	return "LN" + strings.ToUpper(uuid.New().String()[:8])
}

func (r *Repository) SumMemberDeposits(ctx context.Context, membershipID string) (float64, error) {
	var sum *string
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(amount), 0)::text FROM transactions
		WHERE membership_id = $1 AND transaction_type = 'deposit' AND status != 'cancelled'`, membershipID,
	).Scan(&sum)
	if err != nil {
		return 0, err
	}
	if sum == nil {
		return 0, nil
	}
	return ParseAmount(*sum)
}

func (r *Repository) CountPaidInstallments(ctx context.Context, loanID string) (int, error) {
	var n int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*)::int FROM loan_installments WHERE loan_id = $1 AND status = 'paid'`, loanID).Scan(&n)
	return n, err
}

func (r *Repository) MemberInfo(ctx context.Context, membershipID string) (name, phone string, err error) {
	err = r.db.QueryRow(ctx, `
		SELECT u.full_name, u.phone FROM sacco_memberships m
		JOIN users u ON u.id = m.user_id WHERE m.id = $1`, membershipID,
	).Scan(&name, &phone)
	return
}

func (r *Repository) WithTx(ctx context.Context, fn func(pgx.Tx) error) error {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
