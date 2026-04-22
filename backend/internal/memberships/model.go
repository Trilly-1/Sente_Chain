package memberships

import (
	"time"

	"github.com/google/uuid"
)

// Role constants
const (
	RoleMember  = "member"
	RoleCashier = "cashier"
	RoleAdmin   = "admin"
)

// Status constants
const (
	StatusPending   = "pending"
	StatusActive    = "active"
	StatusSuspended = "suspended"
)

// ValidRoles is a set of valid membership roles
var ValidRoles = []string{RoleMember, RoleCashier, RoleAdmin}

// ValidStatuses is a set of valid membership statuses
var ValidStatuses = []string{StatusPending, StatusActive, StatusSuspended}

// Membership represents a user membership in a SACCO
type Membership struct {
	ID        uuid.UUID  `db:"id" json:"id"`
	UserID    uuid.UUID  `db:"user_id" json:"user_id"`
	SaccoID   uuid.UUID  `db:"sacco_id" json:"sacco_id"`
	Role      string     `db:"role" json:"role"`
	Status    string     `db:"status" json:"status"`
	JoinedAt  *time.Time `db:"joined_at" json:"joined_at,omitempty"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt time.Time  `db:"updated_at" json:"updated_at"`
}

// CreateMembershipRequest is the payload for membership creation
type CreateMembershipRequest struct {
	UserID  uuid.UUID `json:"user_id"`
	SaccoID uuid.UUID `json:"sacco_id"`
	Role    string    `json:"role"`
}
