package auth

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/jackc/pgx/v4"
	"golang.org/x/crypto/bcrypt"
	"sentechain-backend/internal/users"
)

// Service handles authentication business logic
type Service struct {
	authRepo  *Repository
	userRepo  *users.Repository
	jwtSecret string
}

// NewService creates a new auth service
func NewService(authRepo *Repository, userRepo *users.Repository, jwtSecret string) *Service {
	return &Service{
		authRepo:  authRepo,
		userRepo:  userRepo,
		jwtSecret: jwtSecret,
	}
}

// SendOTP generates and stores an OTP for a phone number
func (s *Service) SendOTP(ctx context.Context, phone string) (string, error) {
	if phone == "" {
		return "", errors.New("phone cannot be empty")
	}

	// Generate 6-digit OTP
	otp := generateOTP()

	// Hash the OTP before storing
	hashedOTP, err := hashOTP(otp)
	if err != nil {
		return "", fmt.Errorf("failed to hash OTP: %w", err)
	}

	// Store OTP with 10-minute expiry
	expiresAt := time.Now().Add(10 * time.Minute)
	_, err = s.authRepo.CreateOTP(ctx, phone, hashedOTP, expiresAt)
	if err != nil {
		return "", fmt.Errorf("failed to store OTP: %w", err)
	}

	return otp, nil
}

// VerifyOTP verifies an OTP and issues a JWT
func (s *Service) VerifyOTP(ctx context.Context, phone, code, fullName string) (string, *users.User, error) {
	if phone == "" {
		return "", nil, errors.New("phone cannot be empty")
	}
	if code == "" {
		return "", nil, errors.New("code cannot be empty")
	}

	// Fetch latest unexpired unused OTP
	otpRecord, err := s.authRepo.GetLatestOTPByPhone(ctx, phone)
	if err != nil {
		return "", nil, fmt.Errorf("OTP not found or expired: %w", err)
	}

	// Compare provided OTP with stored hash
	if !verifyOTP(code, otpRecord.CodeHash) {
		return "", nil, errors.New("invalid OTP code")
	}

	// Find or create user
	user, err := s.userRepo.GetByPhone(ctx, phone)
	if err != nil {
		// Check if it's a "not found" error
		if !errors.Is(err, pgx.ErrNoRows) {
			return "", nil, fmt.Errorf("failed to get user: %w", err)
		}
		// User doesn't exist, create one
		if fullName == "" {
			return "", nil, errors.New("full_name is required when creating a new user")
		}

		user, err = s.userRepo.Create(ctx, &users.CreateUserRequest{
			FullName: fullName,
			Phone:    phone,
		})
		if err != nil {
			return "", nil, fmt.Errorf("failed to create user: %w", err)
		}
	}

	// Ensure auth identity exists
	_, err = s.authRepo.GetIdentityByProvider(ctx, ProviderPhoneOTP, phone)
	if err != nil {
		// Check if it's a "not found" error
		if !errors.Is(err, pgx.ErrNoRows) {
			return "", nil, fmt.Errorf("failed to get identity: %w", err)
		}
		// Identity doesn't exist, create one
		_, err = s.authRepo.CreateIdentity(ctx, &CreateIdentityRequest{
			UserID:         user.ID,
			Provider:       ProviderPhoneOTP,
			ProviderUserID: phone,
		})
		if err != nil {
			return "", nil, fmt.Errorf("failed to create auth identity: %w", err)
		}
	}

	// Issue JWT token
	token, err := GenerateToken(user.ID, user.Phone, s.jwtSecret, 24)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}

	// Mark OTP as used ONLY after successful token generation succeeds
	err = s.authRepo.MarkOTPAsUsed(ctx, otpRecord.ID.String())
	if err != nil {
		return "", nil, fmt.Errorf("failed to mark OTP as used: %w", err)
	}

	return token, user, nil
}

// generateOTP generates a random 6-digit OTP
func generateOTP() string {
	const length = 6
	const charset = "0123456789"

	result := make([]byte, length)
	for i := 0; i < length; i++ {
		num, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		result[i] = charset[num.Int64()]
	}

	return string(result)
}

// hashOTP hashes an OTP using bcrypt
func hashOTP(otp string) (string, error) {
	hashedOTP, err := bcrypt.GenerateFromPassword([]byte(otp), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedOTP), nil
}

// verifyOTP verifies an OTP against a hash
func verifyOTP(otp, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(otp))
	return err == nil
}
