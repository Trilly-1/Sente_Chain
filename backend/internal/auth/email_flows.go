package auth

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/jackc/pgx/v4"
	"sentechain-backend/internal/users"
)

const (
	emailVerificationTTL = 24 * time.Hour
	pinResetTTL          = 1 * time.Hour
)

func (s *Service) emailEnabled() bool {
	return s.emailClient != nil && s.emailClient.Enabled()
}

func normalizeEmail(raw string) (string, error) {
	emailAddr := strings.ToLower(strings.TrimSpace(raw))
	if emailAddr == "" {
		return "", errors.New("email is required")
	}
	if _, err := mail.ParseAddress(emailAddr); err != nil {
		return "", errors.New("invalid email address")
	}
	return emailAddr, nil
}

func isEmailVerified(user *users.User) bool {
	if user.Email == nil || *user.Email == "" {
		return true
	}
	return user.EmailVerifiedAt != nil
}

func (s *Service) issueEmailToken(ctx context.Context, userID, tokenType string, ttl time.Duration) (string, error) {
	rawToken, err := generateSecureToken()
	if err != nil {
		return "", err
	}

	tokenHash, err := hashSecret(rawToken)
	if err != nil {
		return "", fmt.Errorf("failed to hash token: %w", err)
	}

	_, err = s.authRepo.CreateEmailToken(ctx, userID, tokenHash, tokenType, time.Now().Add(ttl))
	if err != nil {
		return "", err
	}

	return rawToken, nil
}

func (s *Service) findEmailToken(ctx context.Context, rawToken, tokenType string) (*EmailToken, error) {
	if rawToken == "" {
		return nil, errors.New("token is required")
	}

	tokens, err := s.authRepo.GetValidEmailTokens(ctx, tokenType)
	if err != nil {
		return nil, err
	}

	for _, token := range tokens {
		if verifySecret(rawToken, token.TokenHash) {
			match := token
			return &match, nil
		}
	}

	return nil, errors.New("invalid or expired token")
}

func (s *Service) sendVerificationEmail(ctx context.Context, user *users.User) (string, error) {
	if user.Email == nil || *user.Email == "" {
		return "", errors.New("user has no email")
	}
	if isEmailVerified(user) {
		return "", errors.New("email already verified")
	}

	rawToken, err := s.issueEmailToken(ctx, user.ID.String(), TokenEmailVerification, emailVerificationTTL)
	if err != nil {
		return "", err
	}

	if s.emailEnabled() {
		if err := s.emailClient.SendVerificationEmail(*user.Email, user.FullName, rawToken); err != nil {
			return "", fmt.Errorf("failed to send verification email: %w", err)
		}
		return "", nil
	}

	return fmt.Sprintf("%s/verify-email?token=%s", s.frontendURL, rawToken), nil
}

func (s *Service) sendPINResetEmail(ctx context.Context, user *users.User) (string, error) {
	if user.Email == nil || *user.Email == "" {
		return "", errors.New("user has no email")
	}

	rawToken, err := s.issueEmailToken(ctx, user.ID.String(), TokenPINReset, pinResetTTL)
	if err != nil {
		return "", err
	}

	if s.emailEnabled() {
		if err := s.emailClient.SendPINResetEmail(*user.Email, user.FullName, rawToken); err != nil {
			return "", fmt.Errorf("failed to send PIN reset email: %w", err)
		}
		return "", nil
	}

	return fmt.Sprintf("%s/reset-pin?token=%s", s.frontendURL, rawToken), nil
}

// VerifyEmail confirms a registration email and returns a login token.
func (s *Service) VerifyEmail(ctx context.Context, rawToken string) (string, *AuthUserResponse, error) {
	token, err := s.findEmailToken(ctx, rawToken, TokenEmailVerification)
	if err != nil {
		return "", nil, err
	}

	user, err := s.userRepo.GetByID(ctx, token.UserID.String())
	if err != nil {
		return "", nil, fmt.Errorf("failed to get user: %w", err)
	}

	if err := s.userRepo.MarkEmailVerified(ctx, user.ID.String()); err != nil {
		return "", nil, err
	}
	if err := s.authRepo.MarkEmailTokenAsUsed(ctx, token.ID.String()); err != nil {
		return "", nil, err
	}

	user.EmailVerifiedAt = ptrTime(time.Now())
	jwt, err := GenerateToken(user.ID, user.Phone, s.jwtSecret, s.jwtExpiryHours)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}

	membership, err := s.membershipRepo.GetLatestByUser(ctx, user.ID.String())
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", nil, fmt.Errorf("failed to get membership: %w", err)
	}

	return jwt, enrichAuthUser(ctx, s, user, membership), nil
}

// ResendVerificationEmail sends another verification email.
func (s *Service) ResendVerificationEmail(ctx context.Context, emailAddr string) (*MessageResponse, error) {
	normalized, err := normalizeEmail(emailAddr)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByEmail(ctx, normalized)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &MessageResponse{Message: "If an account exists for that email, a verification link has been sent."}, nil
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	if isEmailVerified(user) {
		return &MessageResponse{Message: "If an account exists for that email, a verification link has been sent."}, nil
	}

	devURL, err := s.sendVerificationEmail(ctx, user)
	if err != nil {
		return nil, err
	}

	resp := &MessageResponse{Message: "If an account exists for that email, a verification link has been sent."}
	if devURL != "" && s.exposeEmailLinks {
		resp.DevVerificationURL = devURL
	}
	return resp, nil
}

// ForgotPIN starts a PIN reset email flow.
func (s *Service) ForgotPIN(ctx context.Context, emailAddr string) (*MessageResponse, error) {
	normalized, err := normalizeEmail(emailAddr)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByEmail(ctx, normalized)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &MessageResponse{Message: "If an account exists for that email, a PIN reset link has been sent."}, nil
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	devURL, err := s.sendPINResetEmail(ctx, user)
	if err != nil {
		return nil, err
	}

	resp := &MessageResponse{Message: "If an account exists for that email, a PIN reset link has been sent."}
	if devURL != "" && s.exposeEmailLinks {
		resp.DevResetURL = devURL
	}
	return resp, nil
}

// ResetPIN completes a PIN reset from an email link.
func (s *Service) ResetPIN(ctx context.Context, rawToken, pin, confirmPIN string) (*MessageResponse, error) {
	if pin == "" || confirmPIN == "" {
		return nil, errors.New("pin and confirm_pin are required")
	}
	if pin != confirmPIN {
		return nil, errors.New("pins do not match")
	}
	if len(pin) < 4 || len(pin) > 6 {
		return nil, errors.New("pin must be 4-6 digits")
	}

	token, err := s.findEmailToken(ctx, rawToken, TokenPINReset)
	if err != nil {
		return nil, err
	}

	pinHash, err := hashSecret(pin)
	if err != nil {
		return nil, fmt.Errorf("failed to hash pin: %w", err)
	}

	if err := s.userRepo.UpdatePinHash(ctx, token.UserID.String(), pinHash); err != nil {
		return nil, err
	}
	if err := s.authRepo.MarkEmailTokenAsUsed(ctx, token.ID.String()); err != nil {
		return nil, err
	}

	return &MessageResponse{Message: "PIN reset successful. You can now sign in with your new PIN."}, nil
}

func generateSecureToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

func ptrTime(t time.Time) *time.Time {
	return &t
}