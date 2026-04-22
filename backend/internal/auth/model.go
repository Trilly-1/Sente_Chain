package auth

import (
	"time"

	"github.com/google/uuid"
)

// Provider constants
const (
	ProviderPhoneOTP = "phone_otp"
	ProviderGoogle   = "google"
	ProviderSEP10    = "sep10"
)

// ValidProviders is a set of valid auth providers
var ValidProviders = []string{ProviderPhoneOTP, ProviderGoogle, ProviderSEP10}

// Identity represents an authentication identity linked to a user
type Identity struct {
	ID             uuid.UUID `db:"id" json:"id"`
	UserID         uuid.UUID `db:"user_id" json:"user_id"`
	Provider       string    `db:"provider" json:"provider"`
	ProviderUserID string    `db:"provider_user_id" json:"provider_user_id"`
	CreatedAt      time.Time `db:"created_at" json:"created_at"`
}

// OTPCode represents an OTP code sent to a phone number
type OTPCode struct {
	ID        uuid.UUID `db:"id" json:"id"`
	Phone     string    `db:"phone" json:"phone"`
	CodeHash  string    `db:"code_hash" json:"-"`
	ExpiresAt time.Time `db:"expires_at" json:"expires_at"`
	Used      bool      `db:"used" json:"used"`
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// CreateIdentityRequest is the payload for identity creation
type CreateIdentityRequest struct {
	UserID         uuid.UUID `json:"user_id"`
	Provider       string    `json:"provider"`
	ProviderUserID string    `json:"provider_user_id"`
}

// SendOTPRequest is the payload for OTP sending
type SendOTPRequest struct {
	Phone string `json:"phone"`
}

// VerifyOTPRequest is the payload for OTP verification
type VerifyOTPRequest struct {
	Phone    string `json:"phone"`
	Code     string `json:"code"`
	FullName string `json:"full_name"`
}

// VerifyOTPResponse is the response for successful OTP verification
type VerifyOTPResponse struct {
	Token string `json:"token"`
	User  struct {
		ID       string `json:"id"`
		FullName string `json:"full_name"`
		Phone    string `json:"phone"`
	} `json:"user"`
}

// SendOTPResponse is the response for OTP sending
type SendOTPResponse struct {
	Message string `json:"message"`
	// Raw OTP exposed only in development mode
	RawOTP string `json:"raw_otp,omitempty"`
}
