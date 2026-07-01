package sacco

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

type Repository struct {
	db *pgxpool.Pool
}

func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

const saccoColumns = `id, name, code, status, country, created_by, profile, created_at, updated_at`

func scanSACCO(row pgx.Row) (*SACCO, error) {
	s := &SACCO{}
	err := row.Scan(
		&s.ID, &s.Name, &s.Code, &s.Status, &s.Country, &s.CreatedBy, &s.Profile, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return s, nil
}

func (r *Repository) CreateDraft(ctx context.Context, name, code, country, createdBy string, profile json.RawMessage) (*SACCO, error) {
	query := `
		INSERT INTO saccos (name, code, status, country, created_by, profile)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING ` + saccoColumns

	s, err := scanSACCO(r.db.QueryRow(ctx, query, name, code, StatusDraft, country, createdBy, profile))
	if err != nil {
		return nil, fmt.Errorf("failed to create SACCO draft: %w", err)
	}
	return s, nil
}

func (r *Repository) GetByID(ctx context.Context, id string) (*SACCO, error) {
	query := `SELECT ` + saccoColumns + ` FROM saccos WHERE id = $1`
	s, err := scanSACCO(r.db.QueryRow(ctx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get SACCO by ID: %w", err)
	}
	return s, nil
}

func (r *Repository) GetByCode(ctx context.Context, code string) (*SACCO, error) {
	query := `SELECT ` + saccoColumns + ` FROM saccos WHERE code = $1`
	s, err := scanSACCO(r.db.QueryRow(ctx, query, code))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get SACCO by code: %w", err)
	}
	return s, nil
}

func (r *Repository) UpdateDraft(ctx context.Context, id, name, country string, profile json.RawMessage) (*SACCO, error) {
	query := `
		UPDATE saccos
		SET name = $1, country = $2, profile = $3, updated_at = NOW()
		WHERE id = $4 AND status = $5
		RETURNING ` + saccoColumns

	s, err := scanSACCO(r.db.QueryRow(ctx, query, name, country, profile, id, StatusDraft))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to update SACCO draft: %w", err)
	}
	return s, nil
}

func (r *Repository) UpdateStatus(ctx context.Context, id, status string) (*SACCO, error) {
	query := `
		UPDATE saccos
		SET status = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING ` + saccoColumns

	s, err := scanSACCO(r.db.QueryRow(ctx, query, status, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to update SACCO status: %w", err)
	}
	return s, nil
}

func (r *Repository) ListByStatus(ctx context.Context, status string) ([]*SACCO, error) {
	query := `SELECT ` + saccoColumns + ` FROM saccos WHERE status = $1 ORDER BY updated_at DESC`
	rows, err := r.db.Query(ctx, query, status)
	if err != nil {
		return nil, fmt.Errorf("failed to list SACCOs: %w", err)
	}
	defer rows.Close()

	var list []*SACCO
	for rows.Next() {
		s, err := scanSACCO(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan SACCO: %w", err)
		}
		list = append(list, s)
	}
	return list, rows.Err()
}

func (r *Repository) ListApproved(ctx context.Context) ([]*SACCO, error) {
	return r.ListApprovedFiltered(ctx, "", "")
}

func (r *Repository) ListApprovedFiltered(ctx context.Context, name, country string) ([]*SACCO, error) {
	query := `SELECT ` + saccoColumns + ` FROM saccos WHERE status = $1`
	args := []interface{}{StatusApproved}
	argPos := 2

	if country != "" {
		query += fmt.Sprintf(` AND country = $%d`, argPos)
		args = append(args, country)
		argPos++
	}
	if name != "" {
		query += fmt.Sprintf(` AND name ILIKE $%d`, argPos)
		args = append(args, "%"+name+"%")
		argPos++
	}

	query += ` ORDER BY name ASC`

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to list approved SACCOs: %w", err)
	}
	defer rows.Close()

	var list []*SACCO
	for rows.Next() {
		s, err := scanSACCO(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan SACCO: %w", err)
		}
		list = append(list, s)
	}
	return list, rows.Err()
}
