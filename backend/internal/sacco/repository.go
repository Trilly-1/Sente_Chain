package sacco

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v4/pgxpool"
)

// Repository handles SACCO data access
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new SACCO repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Create inserts a new SACCO and returns the created SACCO
func (r *Repository) Create(ctx context.Context, req *CreateSACCORequest) (*SACCO, error) {
	if req == nil {
		return nil, errors.New("CreateSACCORequest cannot be nil")
	}

	sacco := &SACCO{}
	query := `
		INSERT INTO saccos (name, code)
		VALUES ($1, $2)
		RETURNING id, name, code, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query, req.Name, req.Code).Scan(
		&sacco.ID,
		&sacco.Name,
		&sacco.Code,
		&sacco.CreatedAt,
		&sacco.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create SACCO: %w", err)
	}

	return sacco, nil
}

// GetByID retrieves a SACCO by ID
func (r *Repository) GetByID(ctx context.Context, id string) (*SACCO, error) {
	sacco := &SACCO{}
	query := `
		SELECT id, name, code, created_at, updated_at
		FROM saccos
		WHERE id = $1
	`

	err := r.db.QueryRow(ctx, query, id).Scan(
		&sacco.ID,
		&sacco.Name,
		&sacco.Code,
		&sacco.CreatedAt,
		&sacco.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get SACCO by ID: %w", err)
	}

	return sacco, nil
}

// GetByCode retrieves a SACCO by code
func (r *Repository) GetByCode(ctx context.Context, code string) (*SACCO, error) {
	sacco := &SACCO{}
	query := `
		SELECT id, name, code, created_at, updated_at
		FROM saccos
		WHERE code = $1
	`

	err := r.db.QueryRow(ctx, query, code).Scan(
		&sacco.ID,
		&sacco.Name,
		&sacco.Code,
		&sacco.CreatedAt,
		&sacco.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get SACCO by code: %w", err)
	}

	return sacco, nil
}
