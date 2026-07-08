package transactions

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

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

const txnColumns = `id, reference_number, sacco_id, membership_id, initiated_by,
	transaction_type, amount, currency, description, status, proof_hash, stellar_tx_hash,
	metadata, created_at, updated_at`

func scanTransaction(row pgx.Row) (*Transaction, error) {
	t := &Transaction{}
	var amount string
	err := row.Scan(
		&t.ID, &t.ReferenceNumber, &t.SaccoID, &t.MembershipID, &t.InitiatedBy,
		&t.TransactionType, &amount, &t.Currency, &t.Description, &t.Status,
		&t.ProofHash, &t.StellarTxHash, &t.Metadata, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	t.Amount = amount
	return t, nil
}

type CreateParams struct {
	ReferenceNumber string
	SaccoID         uuid.UUID
	MembershipID    uuid.UUID
	InitiatedBy     uuid.UUID
	TransactionType string
	Amount          string
	Currency        string
	Description     *string
	ProofHash       string
	Metadata        json.RawMessage
}

func (r *Repository) Create(ctx context.Context, p *CreateParams) (*Transaction, error) {
	if p == nil {
		return nil, errors.New("create params cannot be nil")
	}

	query := `
		INSERT INTO transactions (
			reference_number, sacco_id, membership_id, initiated_by,
			transaction_type, amount, currency, description, status, proof_hash, metadata
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		RETURNING ` + txnColumns

	return scanTransaction(r.db.QueryRow(ctx, query,
		p.ReferenceNumber, p.SaccoID, p.MembershipID, p.InitiatedBy,
		p.TransactionType, p.Amount, p.Currency, p.Description,
		StatusRecorded, p.ProofHash, p.Metadata,
	))
}

func (r *Repository) GetByID(ctx context.Context, id string) (*Transaction, error) {
	query := `SELECT ` + txnColumns + ` FROM transactions WHERE id = $1`
	t, err := scanTransaction(r.db.QueryRow(ctx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get transaction: %w", err)
	}
	return t, nil
}

func (r *Repository) List(ctx context.Context, filter ListFilter) ([]*Transaction, error) {
	query := `SELECT ` + txnColumns + ` FROM transactions WHERE 1=1`
	args := []interface{}{}
	argPos := 1

	if filter.SaccoID != "" {
		query += fmt.Sprintf(` AND sacco_id = $%d`, argPos)
		args = append(args, filter.SaccoID)
		argPos++
	}
	if filter.MembershipID != "" {
		query += fmt.Sprintf(` AND membership_id = $%d`, argPos)
		args = append(args, filter.MembershipID)
		argPos++
	}
	if filter.Status != "" {
		query += fmt.Sprintf(` AND status = $%d`, argPos)
		args = append(args, filter.Status)
		argPos++
	}

	query += ` ORDER BY created_at DESC`

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 200 {
		limit = 200
	}
	query += fmt.Sprintf(` LIMIT $%d OFFSET $%d`, argPos, argPos+1)
	args = append(args, limit, filter.Offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list transactions: %w", err)
	}
	defer rows.Close()

	var list []*Transaction
	for rows.Next() {
		t, err := scanTransaction(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan transaction: %w", err)
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

func (r *Repository) GetByStellarHash(ctx context.Context, stellarHash string) (*Transaction, error) {
	query := `SELECT ` + txnColumns + ` FROM transactions WHERE stellar_tx_hash = $1 LIMIT 1`
	t, err := scanTransaction(r.db.QueryRow(ctx, query, stellarHash))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get transaction by stellar hash: %w", err)
	}
	return t, nil
}

// SaccoStats holds aggregate transaction counts for a SACCO.
type SaccoStats struct {
	Total    int
	Anchored int
}

func (r *Repository) GetSaccoStats(ctx context.Context, saccoID string) (*SaccoStats, error) {
	query := `
		SELECT
			COUNT(*)::int,
			COUNT(*) FILTER (WHERE status = 'blockchain_verified')::int
		FROM transactions WHERE sacco_id = $1
	`
	stats := &SaccoStats{}
	err := r.db.QueryRow(ctx, query, saccoID).Scan(&stats.Total, &stats.Anchored)
	if err != nil {
		return nil, fmt.Errorf("failed to get sacco transaction stats: %w", err)
	}
	return stats, nil
}

func (r *Repository) ListPublicBySacco(ctx context.Context, saccoID string, limit int) ([]*Transaction, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}

	query := `SELECT ` + txnColumns + `
		FROM transactions
		WHERE sacco_id = $1
		ORDER BY created_at DESC
		LIMIT $2`

	rows, err := r.db.Query(ctx, query, saccoID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to list public transactions: %w", err)
	}
	defer rows.Close()

	var list []*Transaction
	for rows.Next() {
		t, err := scanTransaction(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan transaction: %w", err)
		}
		list = append(list, t)
	}
	return list, rows.Err()
}

func (r *Repository) UpdateAnchorResult(ctx context.Context, id, status string, stellarTxHash *string) (*Transaction, error) {
	query := `
		UPDATE transactions
		SET status = $1, stellar_tx_hash = $2, updated_at = NOW()
		WHERE id = $3
		RETURNING ` + txnColumns

	t, err := scanTransaction(r.db.QueryRow(ctx, query, status, stellarTxHash, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to update anchor result: %w", err)
	}
	return t, nil
}

func (r *Repository) UpdateProofHash(ctx context.Context, id, proofHash string) (*Transaction, error) {
	query := `
		UPDATE transactions SET proof_hash = $1, updated_at = NOW() WHERE id = $2
		RETURNING ` + txnColumns

	t, err := scanTransaction(r.db.QueryRow(ctx, query, proofHash, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to update proof hash: %w", err)
	}
	return t, nil
}

func (r *Repository) SetStatus(ctx context.Context, id, status string) (*Transaction, error) {
	query := `
		UPDATE transactions SET status = $1, updated_at = NOW() WHERE id = $2
		RETURNING ` + txnColumns

	t, err := scanTransaction(r.db.QueryRow(ctx, query, status, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to update status: %w", err)
	}
	return t, nil
}

func parseAmountStr(s string) float64 {
	var v float64
	_, _ = fmt.Sscanf(s, "%f", &v)
	return v
}

func (r *Repository) GetMemberBalance(ctx context.Context, membershipID string) (*MemberBalanceSummary, error) {
	query := `
		SELECT
			COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'deposit' AND status != 'cancelled'), 0)::text,
			COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'withdrawal' AND status != 'cancelled'), 0)::text,
			COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'loan_disbursement' AND status != 'cancelled'), 0)::text,
			COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'loan_repayment' AND status != 'cancelled'), 0)::text,
			COALESCE(MAX(currency) FILTER (WHERE currency IS NOT NULL AND currency != ''), 'UGX')
		FROM transactions WHERE membership_id = $1`

	var dep, wit, loan, rep, cur string
	err := r.db.QueryRow(ctx, query, membershipID).Scan(&dep, &wit, &loan, &rep, &cur)
	if err != nil {
		return nil, fmt.Errorf("failed to get member balance: %w", err)
	}

	deposits := parseAmountStr(dep)
	withdrawals := parseAmountStr(wit)
	return &MemberBalanceSummary{
		MembershipID:       membershipID,
		Currency:           cur,
		TotalDeposits:      deposits,
		TotalWithdrawals:   withdrawals,
		TotalLoansReceived: parseAmountStr(loan),
		TotalRepaid:        parseAmountStr(rep),
		SavingsBalance:     deposits - withdrawals,
	}, nil
}

func (r *Repository) SavingsBalancesBySacco(ctx context.Context, saccoID string) (map[string]float64, error) {
	query := `
		SELECT membership_id::text,
			COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'deposit' AND status != 'cancelled'), 0)
			- COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'withdrawal' AND status != 'cancelled'), 0)
		FROM transactions WHERE sacco_id = $1
		GROUP BY membership_id`

	rows, err := r.db.Query(ctx, query, saccoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make(map[string]float64)
	for rows.Next() {
		var id string
		var bal float64
		if err := rows.Scan(&id, &bal); err != nil {
			return nil, err
		}
		out[id] = bal
	}
	return out, rows.Err()
}

func (r *Repository) LoanOutstanding(ctx context.Context, membershipID string) (float64, error) {
	var sum *string
	err := r.db.QueryRow(ctx, `
		SELECT COALESCE(SUM(balance_remaining), 0)::text FROM loans
		WHERE membership_id = $1 AND status = 'active'`, membershipID,
	).Scan(&sum)
	if err != nil {
		return 0, err
	}
	if sum == nil {
		return 0, nil
	}
	return parseAmountStr(*sum), nil
}
