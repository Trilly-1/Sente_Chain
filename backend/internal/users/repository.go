package users

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

// Repository handles user data access
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new user repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

const userColumns = `id, full_name, phone, email, google_id, stellar_public_key, country, pin_hash, is_project_admin, created_at, updated_at`

func scanUser(row pgx.Row) (*User, error) {
	user := &User{}
	err := row.Scan(
		&user.ID,
		&user.FullName,
		&user.Phone,
		&user.Email,
		&user.GoogleID,
		&user.StellarPublicKey,
		&user.Country,
		&user.PinHash,
		&user.IsProjectAdmin,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return user, nil
}

// Create inserts a new user and returns the created user
func (r *Repository) Create(ctx context.Context, req *CreateUserRequest) (*User, error) {
	if req == nil {
		return nil, errors.New("CreateUserRequest cannot be nil")
	}

	query := `
		INSERT INTO users (full_name, phone, email, country, pin_hash, is_project_admin)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING ` + userColumns

	user, err := scanUser(r.db.QueryRow(ctx, query,
		req.FullName, req.Phone, req.Email, req.Country, req.PinHash, req.IsProjectAdmin,
	))
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// GetByID retrieves a user by ID
func (r *Repository) GetByID(ctx context.Context, id string) (*User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE id = $1`

	user, err := scanUser(r.db.QueryRow(ctx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	return user, nil
}

// GetByPhone retrieves a user by phone number
func (r *Repository) GetByPhone(ctx context.Context, phone string) (*User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE phone = $1`

	user, err := scanUser(r.db.QueryRow(ctx, query, phone))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get user by phone: %w", err)
	}

	return user, nil
}

// GetByEmail retrieves a user by email
func (r *Repository) GetByEmail(ctx context.Context, email string) (*User, error) {
	query := `SELECT ` + userColumns + ` FROM users WHERE email = $1`

	user, err := scanUser(r.db.QueryRow(ctx, query, email))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, pgx.ErrNoRows
		}
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	return user, nil
}
