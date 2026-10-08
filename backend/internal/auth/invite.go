package auth

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"sentechain-backend/internal/memberships"
	"sentechain-backend/internal/sacco"
	"sentechain-backend/internal/users"
)

const memberInviteTTL = 72 * time.Hour

// InviteMember saves a member with no PIN and emails them a personal invite link.
// They stay pending until they open that link and choose their own PIN.
func (s *Service) InviteMember(ctx context.Context, saccoID string, req *InviteMemberRequest) (*InviteMemberResponse, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}

	fullName := strings.TrimSpace(req.FullName)
	if fullName == "" {
		return nil, errors.New("full name is required")
	}

	phone := strings.ReplaceAll(strings.TrimSpace(req.Phone), " ", "")
	if phone == "" || !strings.HasPrefix(phone, "+") {
		return nil, errors.New("phone must include the country code")
	}

	emailAddr, err := normalizeEmail(req.Email)
	if err != nil {
		return nil, err
	}

	role := strings.TrimSpace(req.Role)
	if role == "" {
		role = memberships.RoleMember
	}
	if role != memberships.RoleMember && role != memberships.RoleCashier {
		return nil, errors.New("role must be member or cashier")
	}

	saccoUUID, err := uuid.Parse(saccoID)
	if err != nil {
		return nil, errors.New("invalid sacco_id")
	}

	saccoRecord, err := s.saccoRepo.GetByID(ctx, saccoUUID.String())
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("SACCO not found")
		}
		return nil, fmt.Errorf("failed to verify SACCO: %w", err)
	}
	if saccoRecord.Status != sacco.StatusApproved {
		return nil, errors.New("SACCO is not approved for new members")
	}

	_, err = s.userRepo.GetByPhone(ctx, phone)
	if err == nil {
		return nil, errors.New("phone number already registered")
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("failed to check phone: %w", err)
	}

	_, err = s.userRepo.GetByEmail(ctx, emailAddr)
	if err == nil {
		return nil, errors.New("email already registered")
	}
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("failed to check email: %w", err)
	}

	country := strings.TrimSpace(req.Country)
	if country == "" {
		country = "UG"
	}

	user, err := s.userRepo.Create(ctx, &users.CreateUserRequest{
		FullName: fullName,
		Phone:    phone,
		Email:    &emailAddr,
		Country:  &country,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	membership, err := s.membershipRepo.Create(ctx, &memberships.CreateMembershipRequest{
		UserID:  user.ID,
		SaccoID: saccoUUID,
		Role:    role,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create membership: %w", err)
	}

	_, err = s.authRepo.CreateIdentity(ctx, &CreateIdentityRequest{
		UserID:         user.ID,
		Provider:       ProviderPhonePIN,
		ProviderUserID: phone,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create auth identity: %w", err)
	}

	resp := &InviteMemberResponse{
		Message:      "Invite sent. They stay pending until they confirm the email and choose a PIN.",
		MembershipID: membership.ID.String(),
		Status:       membership.Status,
		FullName:     user.FullName,
		Phone:        user.Phone,
		Email:        emailAddr,
		Role:         membership.Role,
	}

	devURL, err := s.sendMemberInviteEmail(ctx, user, saccoRecord.Name)
	if err != nil {
		return nil, fmt.Errorf("member saved as pending, but the invite email could not be sent: %w", err)
	}
	if devURL != "" && s.exposeEmailLinks {
		resp.DevInviteURL = devURL
	}

	return resp, nil
}

func (s *Service) sendMemberInviteEmail(ctx context.Context, user *users.User, saccoName string) (string, error) {
	if user.Email == nil || *user.Email == "" {
		return "", errors.New("user has no email")
	}

	rawToken, err := s.issueEmailToken(ctx, user.ID.String(), TokenMemberInvite, memberInviteTTL)
	if err != nil {
		return "", err
	}

	if s.emailEnabled() {
		if err := s.emailClient.SendMemberInviteEmail(*user.Email, user.FullName, saccoName, rawToken); err != nil {
			return "", fmt.Errorf("failed to send invite email: %w", err)
		}
		return "", nil
	}

	return fmt.Sprintf("%s/accept-invite?token=%s", s.frontendURL, rawToken), nil
}

// AcceptInvite sets the member's PIN, confirms the email, and activates the membership.
func (s *Service) AcceptInvite(ctx context.Context, rawToken, pin, confirmPIN string) (*MessageResponse, error) {
	if pin == "" || confirmPIN == "" {
		return nil, errors.New("pin and confirm_pin are required")
	}
	if pin != confirmPIN {
		return nil, errors.New("pins do not match")
	}
	if !validMemberPIN(pin) {
		return nil, errors.New("pin must be 4 digits")
	}

	token, err := s.findEmailToken(ctx, rawToken, TokenMemberInvite)
	if err != nil {
		return nil, err
	}

	membership, err := s.membershipRepo.GetLatestByUser(ctx, token.UserID.String())
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("no SACCO membership found for this invite")
		}
		return nil, fmt.Errorf("failed to get membership: %w", err)
	}

	switch membership.Status {
	case memberships.StatusPendingKYC, memberships.StatusUnderReview:
		if _, err := s.membershipRepo.Activate(ctx, membership.ID.String()); err != nil {
			return nil, fmt.Errorf("failed to activate membership: %w", err)
		}
	case memberships.StatusActive:
		// PIN can still be set if a previous attempt activated the membership.
	default:
		return nil, errors.New("this invite can no longer be accepted")
	}

	pinHash, err := hashSecret(pin)
	if err != nil {
		return nil, fmt.Errorf("failed to hash pin: %w", err)
	}
	if err := s.userRepo.UpdatePinHash(ctx, token.UserID.String(), pinHash); err != nil {
		return nil, err
	}
	if err := s.userRepo.MarkEmailVerified(ctx, token.UserID.String()); err != nil {
		return nil, err
	}
	if err := s.authRepo.MarkEmailTokenAsUsed(ctx, token.ID.String()); err != nil {
		return nil, err
	}

	return &MessageResponse{Message: "Your account is active. Sign in with your phone and the PIN you just chose."}, nil
}

func validMemberPIN(pin string) bool {
	if len(pin) != 4 {
		return false
	}
	for _, c := range pin {
		if c < '0' || c > '9' {
			return false
		}
	}
	return true
}
