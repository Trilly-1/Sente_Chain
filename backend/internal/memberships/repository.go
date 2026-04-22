package memberships

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v4/pgxpool"
)

// Repository handles membership data access
type Repository struct {
	db *pgxpool.Pool
}

// NewRepository creates a new membership repository
func NewRepository(db *pgxpool.Pool) *Repository {
	return &Repository{db: db}
}

// Create inserts a new membership and returns the created membership
func (r *Repository) Create(ctx context.Context, req *CreateMembershipRequest) (*Membership, error) {
	if req == nil {
		return nil, errors.New("CreateMembershipRequest cannot be nil")
	}

	// Validate role
	validRole := false
	for _, vr := range ValidRoles {
		if req.Role == vr {
			validRole = true
			break
		}
	}
	if !validRole {
		return nil, fmt.Errorf("invalid role: %s", req.Role)
	}

	membership := &Membership{}
	query := `
		INSERT INTO sacco_memberships (user_id, sacco_id, role, status)
		VALUES ($1, $2, $3, $4)
		RETURNING id, user_id, sacco_id, role, status, joined_at, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query, req.UserID, req.SaccoID, req.Role, StatusPending).Scan(
		&membership.ID,
		&membership.UserID,
		&membership.SaccoID,
		&membership.Role,
		&membership.Status,
		&membership.JoinedAt,
		&membership.CreatedAt,
		&membership.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create membership: %w", err)
	}

	return membership, nil
}

// GetByID retrieves a membership by ID
func (r *Repository) GetByID(ctx context.Context, id string) (*Membership, error) {
	membership := &Membership{}
	query := `
		SELECT id, user_id, sacco_id, role, status, joined_at, created_at, updated_at
		FROM sacco_memberships
		WHERE id = $1
	`

	err := r.db.QueryRow(ctx, query, id).Scan(
		&membership.ID,
		&membership.UserID,
		&membership.SaccoID,
		&membership.Role,
		&membership.Status,
		&membership.JoinedAt,
		&membership.CreatedAt,
		&membership.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get membership by ID: %w", err)
	}

	return membership, nil
}

// GetByUserAndSacco retrieves a membership by user and SACCO
func (r *Repository) GetByUserAndSacco(ctx context.Context, userID, saccoID string) (*Membership, error) {
	membership := &Membership{}
	query := `
		SELECT id, user_id, sacco_id, role, status, joined_at, created_at, updated_at
		FROM sacco_memberships
		WHERE user_id = $1 AND sacco_id = $2
	`

	err := r.db.QueryRow(ctx, query, userID, saccoID).Scan(
		&membership.ID,
		&membership.UserID,
		&membership.SaccoID,
		&membership.Role,
		&membership.Status,
		&membership.JoinedAt,
		&membership.CreatedAt,
		&membership.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get membership: %w", err)
	}

	return membership, nil
}

// ListBySacco retrieves all memberships for a SACCO
func (r *Repository) ListBySacco(ctx context.Context, saccoID string) ([]*Membership, error) {
	query := `
		SELECT id, user_id, sacco_id, role, status, joined_at, created_at, updated_at
		FROM sacco_memberships
		WHERE sacco_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query, saccoID)
	if err != nil {
		return nil, fmt.Errorf("failed to list memberships: %w", err)
	}
	defer rows.Close()

	var memberships []*Membership
	for rows.Next() {
		membership := &Membership{}
		err := rows.Scan(
			&membership.ID,
			&membership.UserID,
			&membership.SaccoID,
			&membership.Role,
			&membership.Status,
			&membership.JoinedAt,
			&membership.CreatedAt,
			&membership.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan membership: %w", err)
		}
		memberships = append(memberships, membership)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating memberships: %w", err)
	}

	return memberships, nil
}

// UpdateRole updates the role of a membership
func (r *Repository) UpdateRole(ctx context.Context, membershipID, role string) (*Membership, error) {
	// Validate role
	validRole := false
	for _, vr := range ValidRoles {
		if role == vr {
			validRole = true
			break
		}
	}
	if !validRole {
		return nil, fmt.Errorf("invalid role: %s", role)
	}

	membership := &Membership{}
	query := `
		UPDATE sacco_memberships
		SET role = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, user_id, sacco_id, role, status, joined_at, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query, role, membershipID).Scan(
		&membership.ID,
		&membership.UserID,
		&membership.SaccoID,
		&membership.Role,
		&membership.Status,
		&membership.JoinedAt,
		&membership.CreatedAt,
		&membership.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update role: %w", err)
	}

	return membership, nil
}

// UpdateStatus updates the status of a membership
func (r *Repository) UpdateStatus(ctx context.Context, membershipID, status string) (*Membership, error) {
	// Validate status
	validStatus := false
	for _, vs := range ValidStatuses {
		if status == vs {
			validStatus = true
			break
		}
	}
	if !validStatus {
		return nil, fmt.Errorf("invalid status: %s", status)
	}

	membership := &Membership{}
	query := `
		UPDATE sacco_memberships
		SET status = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, user_id, sacco_id, role, status, joined_at, created_at, updated_at
	`

	err := r.db.QueryRow(ctx, query, status, membershipID).Scan(
		&membership.ID,
		&membership.UserID,
		&membership.SaccoID,
		&membership.Role,
		&membership.Status,
		&membership.JoinedAt,
		&membership.CreatedAt,
		&membership.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update status: %w", err)
	}

	return membership, nil
}
