package sacco

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

const (
	StatusDraft       = "draft"
	StatusUnderReview = "under_review"
	StatusApproved    = "approved"
	StatusRejected    = "rejected"
	StatusBlocked     = "blocked"
)

var ValidStatuses = []string{StatusDraft, StatusUnderReview, StatusApproved, StatusRejected, StatusBlocked}

// SACCO represents a Savings and Credit Cooperative Organization
type SACCO struct {
	ID        uuid.UUID       `json:"id"`
	Name      string          `json:"name"`
	Code      string          `json:"code"`
	Status    string          `json:"status"`
	Country   *string         `json:"country,omitempty"`
	CreatedBy *uuid.UUID      `json:"created_by,omitempty"`
	Profile   json.RawMessage `json:"profile"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// CreateApplicationRequest starts a new SACCO draft application
type CreateApplicationRequest struct {
	Name    string                 `json:"name"`
	Country string                 `json:"country"`
	Profile map[string]interface{} `json:"profile"`
}

// UpdateApplicationRequest updates draft SACCO profile fields
type UpdateApplicationRequest struct {
	Name    *string                `json:"name,omitempty"`
	Country *string                `json:"country,omitempty"`
	Profile map[string]interface{} `json:"profile,omitempty"`
}

// StatusResponse is returned from status endpoints
type StatusResponse struct {
	SaccoID string `json:"sacco_id"`
	Name    string `json:"name"`
	Status  string `json:"status"`
}

// PublicListItem is a safe SACCO entry for member signup picker
type PublicListItem struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Code    string `json:"code"`
	Country string `json:"country,omitempty"`
}

// DetailResponse includes full draft/review detail for the owning admin
type DetailResponse struct {
	Sacco   StatusResponse         `json:"sacco"`
	Profile map[string]interface{} `json:"profile"`
}

func ProfileToMap(raw json.RawMessage) map[string]interface{} {
	if len(raw) == 0 {
		return map[string]interface{}{}
	}
	var m map[string]interface{}
	if err := json.Unmarshal(raw, &m); err != nil {
		return map[string]interface{}{}
	}
	return m
}

func ProfileFromMap(m map[string]interface{}) json.RawMessage {
	if m == nil {
		return json.RawMessage(`{}`)
	}
	b, err := json.Marshal(m)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return b
}
