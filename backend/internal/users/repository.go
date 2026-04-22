package users

import (
	"context"
	"errors"
	"fmt"

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

// Create inserts a new user and returns the created user
func (r *Repository) Create(ctx context.Context, req *CreateUserRequest) (*User, error) {
	if req == nil {
		return nil, errors.New("CreateUserRequest cannot be nil")
	}

	user := &User{}
	query := `
		INSERT INTO users (full_name, phone, email)
		VALUES ($1, $2, $3)
		RETURNING id, full_name, phone, email, google_id, stellar_public_key, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query, req.FullName, req.Phone, req.Email).Scan(
		&user.ID,
		&user.FullName,
		&user.Phone,
		&user.Email,
		&user.GoogleID,
		&user.StellarPublicKey,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return user, nil
}

// GetByID retrieves a user by ID
func (r *Repository) GetByID(ctx context.Context, id string) (*User, error) {
	user := &User{}
	query := `
		SELECT id, full_name, phone, email, google_id, stellar_public_key, created_at, updated_at
		FROM users
		WHERE id = $1
	`

	err := r.db.QueryRow(ctx, query, id).Scan(
		&user.ID,
		&user.FullName,
		&user.Phone,
		&user.Email,
		&user.GoogleID,
		&user.StellarPublicKey,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}

	return user, nil
}

// GetByPhone retrieves a user by phone number
func (r *Repository) GetByPhone(ctx context.Context, phone string) (*User, error) {
	user := &User{}
	query := `
		SELECT id, full_name, phone, email, google_id, stellar_public_key, created_at, updated_at
		FROM users
		WHERE phone = $1
	`

	err := r.db.QueryRow(ctx, query, phone).Scan(
		&user.ID,
		&user.FullName,
		&user.Phone,
		&user.Email,
		&user.GoogleID,
		&user.StellarPublicKey,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by phone: %w", err)
	}

	return user, nil
}

// GetByEmail retrieves a user by email
func (r *Repository) GetByEmail(ctx context.Context, email string) (*User, error) {
	user := &User{}
	query := `
		SELECT id, full_name, phone, email, google_id, stellar_public_key, created_at, updated_at
		FROM users
		WHERE email = $1
	`

	err := r.db.QueryRow(ctx, query, email).Scan(
		&user.ID,
		&user.FullName,
		&user.Phone,
		&user.Email,
		&user.GoogleID,
		&user.StellarPublicKey,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}

	return user, nil
}
