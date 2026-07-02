package payments

import (
	"context"
	"errors"
	"fmt"
	"strings"

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

const accountColumns = `id, sacco_id, provider, phone_number, account_name, is_primary, is_active, verified_at, created_at, updated_at`

func scanAccount(row pgx.Row) (*PaymentAccount, error) {
	a := &PaymentAccount{}
	err := row.Scan(&a.ID, &a.SaccoID, &a.Provider, &a.PhoneNumber, &a.AccountName, &a.IsPrimary, &a.IsActive, &a.VerifiedAt, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (r *Repository) ListAccounts(ctx context.Context, saccoID string) ([]*PaymentAccount, error) {
	q := `SELECT ` + accountColumns + ` FROM sacco_payment_accounts WHERE sacco_id = $1 AND is_active = true ORDER BY is_primary DESC, provider ASC`
	rows, err := r.db.Query(ctx, q, saccoID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var list []*PaymentAccount
	for rows.Next() {
		a, err := scanAccount(rows)
		if err != nil {
			return nil, err
		}
		list = append(list, a)
	}
	return list, rows.Err()
}

func (r *Repository) UpsertAccount(ctx context.Context, saccoID string, in *AccountInput) (*PaymentAccount, error) {
	phone := NormalizePhone(in.PhoneNumber)
	if in.IsPrimary {
		_, _ = r.db.Exec(ctx, `UPDATE sacco_payment_accounts SET is_primary = false, updated_at = NOW() WHERE sacco_id = $1`, saccoID)
	}
	var name *string
	if in.AccountName != "" {
		name = &in.AccountName
	}
	q := `
		INSERT INTO sacco_payment_accounts (sacco_id, provider, phone_number, account_name, is_primary, is_active, verified_at)
		VALUES ($1, $2, $3, $4, $5, true, NOW())
		ON CONFLICT (sacco_id, provider) DO UPDATE SET
			phone_number = EXCLUDED.phone_number,
			account_name = EXCLUDED.account_name,
			is_primary = EXCLUDED.is_primary,
			is_active = true,
			verified_at = COALESCE(sacco_payment_accounts.verified_at, NOW()),
			updated_at = NOW()
		RETURNING ` + accountColumns
	return scanAccount(r.db.QueryRow(ctx, q, saccoID, in.Provider, phone, name, in.IsPrimary))
}

func (r *Repository) FindSaccoByPayeePhone(ctx context.Context, phone string) (string, error) {
	normalized := NormalizePhone(phone)
	var saccoID string
	err := r.db.QueryRow(ctx, `
		SELECT sacco_id::text FROM sacco_payment_accounts
		WHERE phone_number = $1 AND is_active = true LIMIT 1`, normalized,
	).Scan(&saccoID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", pgx.ErrNoRows
	}
	return saccoID, err
}

func (r *Repository) GetSaccoName(ctx context.Context, saccoID string) (string, error) {
	var name string
	err := r.db.QueryRow(ctx, `SELECT name FROM saccos WHERE id = $1`, saccoID).Scan(&name)
	return name, err
}

func (r *Repository) FindMembershipByReference(ctx context.Context, saccoID, reference string) (string, error) {
	ref := strings.TrimSpace(reference)
	if ref == "" {
		return "", pgx.ErrNoRows
	}
	// Full UUID
	var id string
	err := r.db.QueryRow(ctx, `
		SELECT id::text FROM sacco_memberships
		WHERE sacco_id = $1 AND id::text = $2 AND status = 'active'`, saccoID, ref,
	).Scan(&id)
	if err == nil {
		return id, nil
	}
	// Prefix match (first 8 chars)
	err = r.db.QueryRow(ctx, `
		SELECT id::text FROM sacco_memberships
		WHERE sacco_id = $1 AND status = 'active'
		AND UPPER(REPLACE(id::text, '-', '')) LIKE UPPER($2) || '%'
		LIMIT 1`, saccoID, strings.ReplaceAll(ref, "-", ""),
	).Scan(&id)
	if err != nil {
		return "", err
	}
	return id, nil
}

func (r *Repository) FindMembershipByPhone(ctx context.Context, saccoID, phone string) (string, error) {
	normalized := NormalizePhone(phone)
	var id string
	err := r.db.QueryRow(ctx, `
		SELECT m.id::text FROM sacco_memberships m
		JOIN users u ON u.id = m.user_id
		WHERE m.sacco_id = $1 AND m.status = 'active' AND u.phone = $2
		LIMIT 1`, saccoID, normalized,
	).Scan(&id)
	return id, err
}

func (r *Repository) MemberPhone(ctx context.Context, membershipID string) (string, error) {
	var phone string
	err := r.db.QueryRow(ctx, `
		SELECT u.phone FROM sacco_memberships m
		JOIN users u ON u.id = m.user_id WHERE m.id = $1`, membershipID,
	).Scan(&phone)
	return phone, err
}

func (r *Repository) FindAccountByProvider(ctx context.Context, saccoID, provider string) (*PaymentAccount, error) {
	q := `SELECT ` + accountColumns + ` FROM sacco_payment_accounts WHERE sacco_id = $1 AND provider = $2 AND is_active = true LIMIT 1`
	a, err := scanAccount(r.db.QueryRow(ctx, q, saccoID, provider))
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, pgx.ErrNoRows
	}
	return a, err
}

func (r *Repository) InsertInboundEvent(ctx context.Context, event *InboundEvent) (*InboundEvent, error) {
	q := `
		INSERT INTO inbound_payment_events (
			sacco_id, provider, external_id, payer_phone, payee_phone,
			amount, currency, reference_text, status, membership_id, transaction_id, raw_payload
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
		RETURNING id, created_at`
	err := r.db.QueryRow(ctx, q,
		event.SaccoID, event.Provider, event.ExternalID, event.PayerPhone, event.PayeePhone,
		event.Amount, event.Currency, event.ReferenceText, event.Status,
		event.MembershipID, event.TransactionID, event.RawPayload,
	).Scan(&event.ID, &event.CreatedAt)
	return event, err
}

func (r *Repository) UpdateInboundEventStatus(ctx context.Context, eventID, status string, membershipID, transactionID *uuid.UUID) error {
	_, err := r.db.Exec(ctx, `
		UPDATE inbound_payment_events SET status = $1, membership_id = $2, transaction_id = $3
		WHERE id = $4`, status, membershipID, transactionID, eventID,
	)
	return err
}

func (r *Repository) SetPrimary(ctx context.Context, saccoID, accountID string) error {
	_, err := r.db.Exec(ctx, `UPDATE sacco_payment_accounts SET is_primary = false, updated_at = NOW() WHERE sacco_id = $1`, saccoID)
	if err != nil {
		return err
	}
	_, err = r.db.Exec(ctx, `UPDATE sacco_payment_accounts SET is_primary = true, updated_at = NOW() WHERE id = $1 AND sacco_id = $2`, accountID, saccoID)
	return err
}

func NormalizePhone(phone string) string {
	p := strings.TrimSpace(phone)
	p = strings.ReplaceAll(p, " ", "")
	if strings.HasPrefix(p, "+") {
		return p
	}
	if strings.HasPrefix(p, "0") {
		return "+256" + p[1:]
	}
	if strings.HasPrefix(p, "256") {
		return "+" + p
	}
	return "+256" + p
}

func FormatAmount(v float64) string {
	return fmt.Sprintf("%.2f", v)
}
