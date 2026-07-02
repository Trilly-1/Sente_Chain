package loans

import (
	"time"

	"github.com/google/uuid"
)

const (
	StatusPending   = "pending"
	StatusActive    = "active"
	StatusCompleted = "completed"
	StatusRejected  = "rejected"
	StatusCancelled = "cancelled"

	MethodFlat             = "flat"
	MethodReducingBalance  = "reducing_balance"

	InstallmentPending = "pending"
	InstallmentPaid    = "paid"
	InstallmentPartial = "partial"
	InstallmentOverdue = "overdue"
)

type LoanProduct struct {
	ID                 uuid.UUID `json:"id"`
	SaccoID            uuid.UUID `json:"sacco_id"`
	Name               string    `json:"name"`
	InterestRateAnnual string    `json:"interest_rate_annual"`
	InterestMethod     string    `json:"interest_method"`
	MinTermMonths      int       `json:"min_term_months"`
	MaxTermMonths      int       `json:"max_term_months"`
	IsDefault          bool      `json:"is_default"`
	IsActive           bool      `json:"is_active"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type Loan struct {
	ID                        uuid.UUID  `json:"id"`
	SaccoID                   uuid.UUID  `json:"sacco_id"`
	MembershipID              uuid.UUID  `json:"membership_id"`
	LoanProductID             *uuid.UUID `json:"loan_product_id,omitempty"`
	ReferenceNumber           string     `json:"reference_number"`
	Principal                 string     `json:"principal"`
	TermMonths                int        `json:"term_months"`
	InterestRateAnnual        string     `json:"interest_rate_annual"`
	InterestMethod            string     `json:"interest_method"`
	Purpose                   *string    `json:"purpose,omitempty"`
	Collateral                *string    `json:"collateral,omitempty"`
	Guarantor                 *string    `json:"guarantor,omitempty"`
	Status                    string     `json:"status"`
	MonthlyInstallment        string     `json:"monthly_installment"`
	TotalInterest             string     `json:"total_interest"`
	TotalRepayable            string     `json:"total_repayable"`
	BalanceRemaining          string     `json:"balance_remaining"`
	PrincipalPaid             string     `json:"principal_paid"`
	InterestPaid              string     `json:"interest_paid"`
	AppliedAt                 time.Time  `json:"applied_at"`
	ApprovedAt                *time.Time `json:"approved_at,omitempty"`
	DisbursedAt               *time.Time `json:"disbursed_at,omitempty"`
	RejectedAt                *time.Time `json:"rejected_at,omitempty"`
	CompletedAt               *time.Time `json:"completed_at,omitempty"`
	ApprovedBy                *uuid.UUID `json:"approved_by,omitempty"`
	DisbursementTransactionID *uuid.UUID `json:"disbursement_transaction_id,omitempty"`
	CreatedAt                 time.Time  `json:"created_at"`
	UpdatedAt                 time.Time  `json:"updated_at"`
}

type Installment struct {
	ID                       uuid.UUID  `json:"id"`
	LoanID                   uuid.UUID  `json:"loan_id"`
	InstallmentNumber        int        `json:"installment_number"`
	DueDate                  time.Time  `json:"due_date"`
	PrincipalDue             string     `json:"principal_due"`
	InterestDue              string     `json:"interest_due"`
	TotalDue                 string     `json:"total_due"`
	PrincipalPaid            string     `json:"principal_paid"`
	InterestPaid             string     `json:"interest_paid"`
	Status                   string     `json:"status"`
	PaidAt                   *time.Time `json:"paid_at,omitempty"`
	RepaymentTransactionID   *uuid.UUID `json:"repayment_transaction_id,omitempty"`
	CreatedAt                time.Time  `json:"created_at"`
	UpdatedAt                time.Time  `json:"updated_at"`
}

type CreateProductRequest struct {
	Name               string  `json:"name"`
	InterestRateAnnual float64 `json:"interest_rate_annual"`
	InterestMethod     string  `json:"interest_method"`
	MinTermMonths      int     `json:"min_term_months"`
	MaxTermMonths      int     `json:"max_term_months"`
	IsDefault          bool    `json:"is_default"`
}

type UpdateProductRequest struct {
	Name               *string  `json:"name"`
	InterestRateAnnual *float64 `json:"interest_rate_annual"`
	InterestMethod     *string  `json:"interest_method"`
	MinTermMonths      *int     `json:"min_term_months"`
	MaxTermMonths      *int     `json:"max_term_months"`
	IsDefault          *bool    `json:"is_default"`
	IsActive           *bool    `json:"is_active"`
}

type ApplyLoanRequest struct {
	LoanProductID *string `json:"loan_product_id"`
	Principal     float64 `json:"principal"`
	TermMonths    int     `json:"term_months"`
	Purpose       string  `json:"purpose"`
	Collateral    string  `json:"collateral"`
	Guarantor     string  `json:"guarantor"`
}

type RepaymentRequest struct {
	Amount float64 `json:"amount"`
}

type LoanListItem struct {
	ID                 string  `json:"id"`
	ReferenceNumber    string  `json:"reference_number"`
	MemberID           string  `json:"member_id"`
	MemberName         string  `json:"member_name"`
	Phone              string  `json:"phone"`
	AmountRequested    float64 `json:"amount_requested"`
	Purpose            string  `json:"purpose"`
	Status             string  `json:"status"`
	AppliedOn          string  `json:"applied_on"`
	InterestRate       float64 `json:"interest_rate"`
	TermMonths         int     `json:"term_months"`
	InterestMethod     string  `json:"interest_method"`
	MonthlyInstallment float64 `json:"monthly_installment"`
	TotalRepayable     float64 `json:"total_repayable"`
	TotalInterest      float64 `json:"total_interest"`
	DisbursedOn        *string `json:"disbursed_on"`
	Collateral         string  `json:"collateral"`
	Guarantor          string  `json:"guarantor"`
	RepaidSoFar        float64 `json:"repaid_so_far"`
	BalanceRemaining   float64 `json:"balance_remaining"`
	PaymentsMade       int     `json:"payments_made"`
	PaymentsTotal      int     `json:"payments_total"`
	NextPaymentDate    *string `json:"next_payment_date"`
	NextPaymentAmount  *float64 `json:"next_payment_amount"`
	PaymentsSchedule   []ScheduleItem `json:"payments_schedule"`
	SavingsBalance     float64        `json:"savings_balance"`
}

type ScheduleItem struct {
	Month     int     `json:"month"`
	DueDate   string  `json:"due_date"`
	Principal float64 `json:"principal"`
	Interest  float64 `json:"interest"`
	Total     float64 `json:"total"`
	Status    string  `json:"status"`
}
