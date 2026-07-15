package auth

import (
	"time"

	"github.com/google/uuid"
)

// Provider constants
const (
	ProviderPhoneOTP = "phone_otp"
	ProviderPhonePIN = "phone_pin"
	ProviderGoogle   = "google"
	ProviderSEP10    = "sep10"
)

// Email token types
const (
	TokenEmailVerification = "email_verification"
	TokenPINReset          = "pin_reset"
)

// ValidEmailTokenTypes lists supported email token purposes.
var ValidEmailTokenTypes = []string{TokenEmailVerification, TokenPINReset}

// ValidProviders is a set of valid auth providers
var ValidProviders = []string{ProviderPhoneOTP, ProviderPhonePIN, ProviderGoogle, ProviderSEP10}

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

// EmailToken represents a one-time email action token.
type EmailToken struct {
	ID        uuid.UUID `db:"id" json:"id"`
	UserID    uuid.UUID `db:"user_id" json:"user_id"`
	TokenHash string    `db:"token_hash" json:"-"`
	TokenType string    `db:"token_type" json:"token_type"`
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

// RegisterRequest is the payload for PIN-based registration
type RegisterRequest struct {
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
	Email    string `json:"email"`
	PIN      string `json:"pin"`
	Country  string `json:"country"`
	SaccoID  string `json:"sacco_id"`
	Role     string `json:"role"`
}

// LoginRequest is the payload for PIN-based login
type LoginRequest struct {
	Phone string `json:"phone"`
	PIN   string `json:"pin"`
}

// AuthUserResponse is returned after register/login and from /auth/me
type AuthUserResponse struct {
	ID              string `json:"id"`
	FullName        string `json:"full_name"`
	Phone           string `json:"phone"`
	Email           string `json:"email,omitempty"`
	EmailVerified   bool   `json:"email_verified"`
	Country         string `json:"country,omitempty"`
	MembershipID    string `json:"membership_id,omitempty"`
	SaccoID         string `json:"sacco_id,omitempty"`
	Role            string `json:"role,omitempty"`
	Status          string `json:"status,omitempty"`
	SaccoStatus     string `json:"sacco_status,omitempty"`
	IsProjectAdmin  bool   `json:"is_project_admin"`
}

// RegisterResponse is returned after successful registration.
type RegisterResponse struct {
	Token                     string `json:"token,omitempty"`
	User                      AuthUserResponse `json:"user"`
	RequiresEmailVerification bool   `json:"requires_email_verification"`
	Message                   string `json:"message,omitempty"`
	DevVerificationURL        string `json:"dev_verification_url,omitempty"`
}

// VerifyEmailRequest confirms a registration email.
type VerifyEmailRequest struct {
	Token string `json:"token"`
}

// ResendVerificationRequest resends a verification email.
type ResendVerificationRequest struct {
	Email string `json:"email"`
}

// ForgotPINRequest starts a PIN reset email flow.
type ForgotPINRequest struct {
	Email string `json:"email"`
}

// ResetPINRequest completes a PIN reset from an email link.
type ResetPINRequest struct {
	Token      string `json:"token"`
	PIN        string `json:"pin"`
	ConfirmPIN string `json:"confirm_pin"`
}

// MessageResponse is a simple success payload.
type MessageResponse struct {
	Message            string `json:"message"`
	DevVerificationURL string `json:"dev_verification_url,omitempty"`
	DevResetURL        string `json:"dev_reset_url,omitempty"`
}

// AuthTokenResponse wraps token and user for auth endpoints
type AuthTokenResponse struct {
	Token string           `json:"token"`
	User  AuthUserResponse `json:"user"`
}
