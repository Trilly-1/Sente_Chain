package saccoops

import "time"

// MemberListItem is a SACCO member visible to staff (no PIN or sensitive data).
type MemberListItem struct {
	MembershipID string  `json:"membership_id"`
	UserID       string  `json:"user_id"`
	FullName     string  `json:"full_name"`
	Phone        string  `json:"phone"`
	Role         string  `json:"role"`
	Status       string  `json:"status"`
	JoinedAt     *string `json:"joined_at,omitempty"`
}

// UpdateRoleRequest changes a member's SACCO role (admin only).
type UpdateRoleRequest struct {
	Role string `json:"role"`
}

// MemberActionResponse is returned after suspend/activate/role change.
type MemberActionResponse struct {
	MembershipID string `json:"membership_id"`
	Role         string `json:"role,omitempty"`
	Status       string `json:"status"`
}

// PublicTransaction is a sanitized transaction for the public ledger.
type PublicTransaction struct {
	ID              string    `json:"id"`
	ReferenceNumber string    `json:"reference_number"`
	TransactionType string    `json:"transaction_type"`
	Amount          string    `json:"amount"`
	Currency        string    `json:"currency"`
	Status          string    `json:"status"`
	StellarTxHash   string    `json:"stellar_tx_hash,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}

// PublicSummary is the public transparency view for a SACCO.
type PublicSummary struct {
	SaccoID            string              `json:"sacco_id"`
	Name               string              `json:"name"`
	Code               string              `json:"code"`
	Country            string              `json:"country,omitempty"`
	Status             string              `json:"status"`
	ActiveMemberCount  int                 `json:"active_member_count"`
	TransactionCount   int                 `json:"transaction_count"`
	AnchoredCount      int                 `json:"anchored_count"`
	RecentTransactions []PublicTransaction `json:"recent_transactions"`
}
