package sacco

import (
	"time"

	"github.com/google/uuid"
)

// SACCO represents a Savings and Credit Cooperative Organization
type SACCO struct {
	ID        uuid.UUID `db:"id" json:"id"`
	Name      string    `db:"name" json:"name"`
	Code      string    `db:"code" json:"code"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// CreateSACCORequest is the payload for SACCO creation
type CreateSACCORequest struct {
	Name string `json:"name"`
	Code string `json:"code"`
}
