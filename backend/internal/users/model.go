package users

import (
	"time"

	"github.com/google/uuid"
)

// User represents a person in the system
type User struct {
	ID               uuid.UUID `db:"id" json:"id"`
	FullName         string    `db:"full_name" json:"full_name"`
	Phone            string    `db:"phone" json:"phone"`
	Email            *string   `db:"email" json:"email,omitempty"`
	GoogleID         *string   `db:"google_id" json:"google_id,omitempty"`
	StellarPublicKey *string   `db:"stellar_public_key" json:"stellar_public_key,omitempty"`
	CreatedAt        time.Time `db:"created_at" json:"created_at"`
	UpdatedAt        time.Time `db:"updated_at" json:"updated_at"`
}

// CreateUserRequest is the payload for user creation
type CreateUserRequest struct {
	FullName string  `json:"full_name"`
	Phone    string  `json:"phone"`
	Email    *string `json:"email,omitempty"`
}
