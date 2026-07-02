package transactions

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

const (
	TypeDeposit          = "deposit"
	TypeWithdrawal       = "withdrawal"
	TypeLoanDisbursement = "loan_disbursement"
	TypeLoanRepayment    = "loan_repayment"
	TypeTransfer         = "transfer"
	TypeFee              = "fee"
	TypeOther            = "other"
)

const (
	StatusRecorded           = "recorded"
	StatusAnchorPending      = "anchor_pending"
	StatusBlockchainVerified = "blockchain_verified"
	StatusAnchorFailed       = "anchor_failed"
	StatusCancelled          = "cancelled"
)

var ValidTypes = []string{
	TypeDeposit, TypeWithdrawal, TypeLoanDisbursement,
	TypeLoanRepayment, TypeTransfer, TypeFee, TypeOther,
}

var ValidStatuses = []string{
	StatusRecorded, StatusAnchorPending, StatusBlockchainVerified,
	StatusAnchorFailed, StatusCancelled,
}

// Transaction is an operational financial record in PostgreSQL.
type Transaction struct {
	ID              uuid.UUID       `json:"id"`
	ReferenceNumber string          `json:"reference_number"`
	SaccoID         uuid.UUID       `json:"sacco_id"`
	MembershipID    uuid.UUID       `json:"membership_id"`
	InitiatedBy     uuid.UUID       `json:"initiated_by"`
	TransactionType string          `json:"transaction_type"`
	Amount          string          `json:"amount"`
	Currency        string          `json:"currency"`
	Description     *string         `json:"description,omitempty"`
	Status          string          `json:"status"`
	ProofHash       *string         `json:"proof_hash,omitempty"`
	StellarTxHash   *string         `json:"stellar_tx_hash,omitempty"`
	Metadata        json.RawMessage `json:"metadata,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

// CreateRequest is the payload for initiating a transaction.
type CreateRequest struct {
	SaccoID         string                 `json:"sacco_id"`
	MembershipID    string                 `json:"membership_id,omitempty"`
	TransactionType string                 `json:"transaction_type"`
	Amount          string                 `json:"amount"`
	Currency        string                 `json:"currency"`
	Description     *string                `json:"description,omitempty"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
}

// ListFilter scopes transaction queries.
type ListFilter struct {
	SaccoID      string
	MembershipID string
	Status       string
	Limit        int
	Offset       int
}

// MemberBalanceSummary is computed from the transaction ledger.
type MemberBalanceSummary struct {
	MembershipID       string  `json:"membership_id"`
	Currency           string  `json:"currency"`
	TotalDeposits      float64 `json:"total_deposits"`
	TotalWithdrawals   float64 `json:"total_withdrawals"`
	TotalLoansReceived float64 `json:"total_loans_received"`
	TotalRepaid        float64 `json:"total_repaid"`
	SavingsBalance     float64 `json:"savings_balance"`
	LoanOutstanding    float64 `json:"loan_outstanding"`
}

// VerifyResult is returned from the verification endpoint.
type VerifyResult struct {
	TransactionID   string `json:"transaction_id"`
	ReferenceNumber string `json:"reference_number"`
	Verified        bool   `json:"verified"`
	Status          string `json:"status"`
	ProofHash       string `json:"proof_hash,omitempty"`
	StellarTxHash   string `json:"stellar_tx_hash,omitempty"`
	Message         string `json:"message,omitempty"`
}

// ProofPayload is hashed for immutable proof (stored off-chain; anchor references this hash).
type ProofPayload struct {
	TransactionID   string `json:"transaction_id"`
	ReferenceNumber string `json:"reference_number"`
	SaccoID         string `json:"sacco_id"`
	MembershipID    string `json:"membership_id"`
	TransactionType string `json:"transaction_type"`
	Amount          string `json:"amount"`
	Currency        string `json:"currency"`
	Timestamp       string `json:"timestamp"`
}
