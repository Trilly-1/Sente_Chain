package audit

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

const (
	ActionMemberApproved = "member.approved"
	ActionMemberRejected = "member.rejected"
	ActionSaccoApproved  = "sacco.approved"
	ActionSaccoRejected  = "sacco.rejected"
	ActionSaccoBlocked          = "sacco.blocked"
	ActionTransactionCreated    = "transaction.created"
	ActionTransactionAnchored   = "transaction.anchored"
	ActionTransactionVerified   = "transaction.verified"
	ActionMemberRoleChanged     = "member.role_changed"
	ActionMemberSuspended       = "member.suspended"
	ActionMemberActivated       = "member.activated"
)

// Log is an immutable audit record
type Log struct {
	ID          uuid.UUID       `json:"id"`
	ActorUserID *uuid.UUID      `json:"actor_user_id,omitempty"`
	Action      string          `json:"action"`
	EntityType  string          `json:"entity_type"`
	EntityID    uuid.UUID       `json:"entity_id"`
	Details     json.RawMessage `json:"details"`
	CreatedAt   time.Time       `json:"created_at"`
}

// CreateRequest is the payload for writing an audit log
type CreateRequest struct {
	ActorUserID *uuid.UUID
	Action      string
	EntityType  string
	EntityID    uuid.UUID
	Details     map[string]interface{}
}
