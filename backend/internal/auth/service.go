package auth

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"golang.org/x/crypto/bcrypt"
	"sentechain-backend/internal/memberships"
	"sentechain-backend/internal/sacco"
	"sentechain-backend/internal/users"
)

// Service handles authentication business logic
type Service struct {
	authRepo       *Repository
	userRepo       *users.Repository
	membershipRepo *memberships.Repository
	saccoRepo      *sacco.Repository
	jwtSecret      string
	jwtExpiryHours int
}

// NewService creates a new auth service
func NewService(authRepo *Repository, userRepo *users.Repository, membershipRepo *memberships.Repository, saccoRepo *sacco.Repository, jwtSecret string, jwtExpiryHours int) *Service {
	if jwtExpiryHours <= 0 {
		jwtExpiryHours = 24
	}
	return &Service{
		authRepo:       authRepo,
		userRepo:       userRepo,
		membershipRepo: membershipRepo,
		saccoRepo:      saccoRepo,
		jwtSecret:      jwtSecret,
		jwtExpiryHours: jwtExpiryHours,
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
	token, err := GenerateToken(user.ID, user.Phone, s.jwtSecret, s.jwtExpiryHours)
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

// Register creates a user with hashed PIN and SACCO membership in pending_kyc status
func (s *Service) Register(ctx context.Context, req *RegisterRequest) (string, *AuthUserResponse, error) {
	if err := validateRegisterRequest(req); err != nil {
		return "", nil, err
	}

	_, err := s.userRepo.GetByPhone(ctx, req.Phone)
	if err == nil {
		return "", nil, errors.New("phone number already registered")
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", nil, fmt.Errorf("failed to check phone: %w", err)
	}

	saccoID, err := uuid.Parse(req.SaccoID)
	if err != nil && req.SaccoID != "" {
		return "", nil, errors.New("invalid sacco_id")
	}

	// Members must join an approved SACCO; SACCO admins register first without a SACCO
	if req.Role == memberships.RoleAdmin && req.SaccoID == "" {
		// user-only registration for SACCO onboarding step 1
	} else {
		if req.SaccoID == "" {
			return "", nil, errors.New("sacco_id is required")
		}
		saccoRecord, err := s.saccoRepo.GetByID(ctx, saccoID.String())
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return "", nil, errors.New("SACCO not found")
			}
			return "", nil, fmt.Errorf("failed to verify SACCO: %w", err)
		}
		if saccoRecord.Status != sacco.StatusApproved {
			return "", nil, errors.New("SACCO is not approved for new member registration")
		}
	}

	pinHash, err := hashSecret(req.PIN)
	if err != nil {
		return "", nil, fmt.Errorf("failed to hash PIN: %w", err)
	}

	country := req.Country
	user, err := s.userRepo.Create(ctx, &users.CreateUserRequest{
		FullName: req.FullName,
		Phone:    req.Phone,
		Country:  &country,
		PinHash:  &pinHash,
	})
	if err != nil {
		return "", nil, fmt.Errorf("failed to create user: %w", err)
	}

	var membership *memberships.Membership
	if req.Role == memberships.RoleAdmin && req.SaccoID == "" {
		// SACCO admin registers before creating the SACCO application
	} else {
		// Public registration always creates a member — cashier/admin via SACCO ops only
		membership, err = s.membershipRepo.Create(ctx, &memberships.CreateMembershipRequest{
			UserID:  user.ID,
			SaccoID: saccoID,
			Role:    memberships.RoleMember,
		})
		if err != nil {
			return "", nil, fmt.Errorf("failed to create membership: %w", err)
		}
	}

	_, err = s.authRepo.CreateIdentity(ctx, &CreateIdentityRequest{
		UserID:         user.ID,
		Provider:       ProviderPhonePIN,
		ProviderUserID: req.Phone,
	})
	if err != nil {
		return "", nil, fmt.Errorf("failed to create auth identity: %w", err)
	}

	token, err := GenerateToken(user.ID, user.Phone, s.jwtSecret, s.jwtExpiryHours)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}

	authUser := enrichAuthUser(ctx, s, user, membership)
	return token, authUser, nil
}

// Login authenticates a user with phone and PIN
func (s *Service) Login(ctx context.Context, phone, pin string) (string, *AuthUserResponse, error) {
	if phone == "" || pin == "" {
		return "", nil, errors.New("phone and pin are required")
	}

	user, err := s.userRepo.GetByPhone(ctx, phone)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return "", nil, errors.New("invalid phone or PIN")
		}
		return "", nil, fmt.Errorf("failed to get user: %w", err)
	}

	if user.PinHash == nil || !verifySecret(pin, *user.PinHash) {
		return "", nil, errors.New("invalid phone or PIN")
	}

	membership, err := s.membershipRepo.GetLatestByUser(ctx, user.ID.String())
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", nil, fmt.Errorf("failed to get membership: %w", err)
	}

	token, err := GenerateToken(user.ID, user.Phone, s.jwtSecret, s.jwtExpiryHours)
	if err != nil {
		return "", nil, fmt.Errorf("failed to generate token: %w", err)
	}

	authUser := enrichAuthUser(ctx, s, user, membership)
	return token, authUser, nil
}

// BuildUserProfile assembles the authenticated user profile for /auth/me
func (s *Service) BuildUserProfile(ctx context.Context, userID string) (*AuthUserResponse, error) {
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("user not found")
		}
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	membership, err := s.membershipRepo.GetLatestByUser(ctx, userID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("failed to get membership: %w", err)
	}

	return enrichAuthUser(ctx, s, user, membership), nil
}

func enrichAuthUser(ctx context.Context, s *Service, user *users.User, membership *memberships.Membership) *AuthUserResponse {
	resp := buildAuthUserResponse(user, membership)
	if membership != nil {
		if saccoRecord, err := s.saccoRepo.GetByID(ctx, membership.SaccoID.String()); err == nil {
			resp.SaccoStatus = saccoRecord.Status
		}
	}
	return resp
}

func validateRegisterRequest(req *RegisterRequest) error {
	if req == nil {
		return errors.New("request cannot be nil")
	}
	if req.FullName == "" {
		return errors.New("full_name is required")
	}
	if req.Phone == "" {
		return errors.New("phone is required")
	}
	if len(req.PIN) < 4 || len(req.PIN) > 6 {
		return errors.New("pin must be 4-6 digits")
	}
	if req.Country == "" {
		return errors.New("country is required")
	}
	if req.SaccoID == "" && req.Role != memberships.RoleAdmin {
		return errors.New("sacco_id is required")
	}

	validRole := false
	for _, role := range memberships.ValidRoles {
		if req.Role == role {
			validRole = true
			break
		}
	}
	if !validRole {
		return errors.New("invalid role")
	}

	return nil
}

func buildAuthUserResponse(user *users.User, membership *memberships.Membership) *AuthUserResponse {
	resp := &AuthUserResponse{
		ID:             user.ID.String(),
		FullName:       user.FullName,
		Phone:          user.Phone,
		IsProjectAdmin: user.IsProjectAdmin,
	}
	if user.Country != nil {
		resp.Country = *user.Country
	}
	if membership != nil {
		resp.MembershipID = membership.ID.String()
		resp.SaccoID = membership.SaccoID.String()
		resp.Role = membership.Role
		resp.Status = membership.Status
	}
	return resp
}

func hashSecret(secret string) (string, error) {
	return hashOTP(secret)
}

func verifySecret(secret, hash string) bool {
	return verifyOTP(secret, hash)
}

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
