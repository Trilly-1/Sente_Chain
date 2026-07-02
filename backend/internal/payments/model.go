package payments

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

const (
	ProviderMTNMoMo      = "mtn_momo"
	ProviderAirtelMoney  = "airtel_money"

	EventReceived  = "received"
	EventMatched   = "matched"
	EventUnmatched = "unmatched"
	EventFailed    = "failed"
)

type PaymentAccount struct {
	ID           uuid.UUID  `json:"id"`
	SaccoID      uuid.UUID  `json:"sacco_id"`
	Provider     string     `json:"provider"`
	PhoneNumber  string     `json:"phone_number"`
	AccountName  *string    `json:"account_name,omitempty"`
	IsPrimary    bool       `json:"is_primary"`
	IsActive     bool       `json:"is_active"`
	VerifiedAt   *time.Time `json:"verified_at,omitempty"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type AccountInput struct {
	Provider    string `json:"provider"`
	PhoneNumber string `json:"phone_number"`
	AccountName string `json:"account_name"`
	IsPrimary   bool   `json:"is_primary"`
}

type UpsertAccountsRequest struct {
	Accounts []AccountInput `json:"accounts"`
}

type PaymentInstructions struct {
	SaccoID            string           `json:"sacco_id"`
	SaccoName          string           `json:"sacco_name"`
	PaymentReference   string           `json:"payment_reference"`
	MemberReference    string           `json:"member_reference"`
	Accounts           []AccountDisplay `json:"accounts"`
	Instructions       []string         `json:"instructions"`
	MTNApiReady        bool             `json:"mtn_api_ready"`
	AirtelApiReady     bool             `json:"airtel_api_ready"`
}

type RequestToPayBody struct {
	SaccoID  string  `json:"sacco_id"`
	Amount   float64 `json:"amount"`
	Provider string  `json:"provider"`
}

type RequestToPayResponse struct {
	Status    string `json:"status"`
	Message   string `json:"message"`
	ExternalID string `json:"external_id,omitempty"`
	Provider  string `json:"provider"`
	Amount    float64 `json:"amount"`
	Currency  string `json:"currency"`
	Mode      string `json:"mode"`
}

type AccountDisplay struct {
	Provider    string `json:"provider"`
	Label       string `json:"label"`
	PhoneNumber string `json:"phone_number"`
	AccountName string `json:"account_name,omitempty"`
	IsPrimary   bool   `json:"is_primary"`
}

type InboundEvent struct {
	ID            uuid.UUID       `json:"id"`
	SaccoID       *uuid.UUID      `json:"sacco_id,omitempty"`
	Provider      string          `json:"provider"`
	ExternalID    string          `json:"external_id"`
	PayerPhone    *string         `json:"payer_phone,omitempty"`
	PayeePhone    *string         `json:"payee_phone,omitempty"`
	Amount        string          `json:"amount"`
	Currency      string          `json:"currency"`
	ReferenceText *string         `json:"reference_text,omitempty"`
	Status        string          `json:"status"`
	MembershipID  *uuid.UUID      `json:"membership_id,omitempty"`
	TransactionID *uuid.UUID      `json:"transaction_id,omitempty"`
	RawPayload    json.RawMessage `json:"raw_payload,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
}

// WebhookPayload is a normalized inbound payment notification (MTN/Airtel or manual test).
type WebhookPayload struct {
	ExternalID  string  `json:"external_id"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	PayerPhone  string  `json:"payer_phone"`
	PayeePhone  string  `json:"payee_phone"`
	Reference   string  `json:"reference"`
	Provider    string  `json:"provider"`
}
