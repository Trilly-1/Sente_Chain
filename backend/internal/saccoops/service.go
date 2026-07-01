package saccoops

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"sentechain-backend/internal/audit"
	"sentechain-backend/internal/memberships"
	"sentechain-backend/internal/sacco"
	"sentechain-backend/internal/transactions"
	"sentechain-backend/internal/users"
)

type Service struct {
	userRepo       *users.Repository
	membershipRepo *memberships.Repository
	saccoRepo      *sacco.Repository
	txnRepo        *transactions.Repository
	auditRepo      *audit.Repository
}

func NewService(
	userRepo *users.Repository,
	membershipRepo *memberships.Repository,
	saccoRepo *sacco.Repository,
	txnRepo *transactions.Repository,
	auditRepo *audit.Repository,
) *Service {
	return &Service{
		userRepo:       userRepo,
		membershipRepo: membershipRepo,
		saccoRepo:      saccoRepo,
		txnRepo:        txnRepo,
		auditRepo:      auditRepo,
	}
}

func (s *Service) ListMembers(ctx context.Context, saccoID, statusFilter string) ([]MemberListItem, error) {
	if err := s.requireApprovedSacco(ctx, saccoID); err != nil {
		return nil, err
	}

	list, err := s.membershipRepo.ListBySacco(ctx, saccoID)
	if err != nil {
		return nil, fmt.Errorf("failed to list members: %w", err)
	}

	result := make([]MemberListItem, 0, len(list))
	for _, m := range list {
		if statusFilter != "" && m.Status != statusFilter {
			continue
		}

		user, err := s.userRepo.GetByID(ctx, m.UserID.String())
		if err != nil {
			return nil, fmt.Errorf("failed to load user %s: %w", m.UserID, err)
		}

		item := MemberListItem{
			MembershipID: m.ID.String(),
			UserID:       user.ID.String(),
			FullName:     user.FullName,
			Phone:        user.Phone,
			Role:         m.Role,
			Status:       m.Status,
		}
		if m.JoinedAt != nil {
			joined := m.JoinedAt.UTC().Format(time.RFC3339)
			item.JoinedAt = &joined
		}
		result = append(result, item)
	}
	return result, nil
}

func (s *Service) UpdateRole(ctx context.Context, actorUserID, saccoID, membershipID string, req *UpdateRoleRequest) (*MemberActionResponse, error) {
	if req == nil || req.Role == "" {
		return nil, errors.New("role is required")
	}
	if req.Role == memberships.RoleAdmin {
		return nil, errors.New("cannot promote to SACCO admin via this endpoint")
	}
	if req.Role != memberships.RoleMember && req.Role != memberships.RoleCashier {
		return nil, errors.New("invalid role")
	}

	target, err := s.getSaccoMembership(ctx, saccoID, membershipID)
	if err != nil {
		return nil, err
	}
	if target.Status != memberships.StatusActive {
		return nil, errors.New("only active memberships can have roles changed")
	}
	if target.Role == memberships.RoleAdmin {
		return nil, errors.New("cannot change the SACCO admin role")
	}

	updated, err := s.membershipRepo.UpdateRole(ctx, membershipID, req.Role)
	if err != nil {
		return nil, err
	}

	actorUUID, _ := uuid.Parse(actorUserID)
	_, _ = s.auditRepo.Create(ctx, &audit.CreateRequest{
		ActorUserID: &actorUUID,
		Action:      audit.ActionMemberRoleChanged,
		EntityType:  "membership",
		EntityID:    updated.ID,
		Details: map[string]interface{}{
			"sacco_id":   saccoID,
			"new_role":   req.Role,
			"old_role":   target.Role,
			"user_id":    target.UserID.String(),
		},
	})

	return &MemberActionResponse{
		MembershipID: updated.ID.String(),
		Role:         updated.Role,
		Status:       updated.Status,
	}, nil
}

func (s *Service) Suspend(ctx context.Context, actorUserID, saccoID, membershipID string) (*MemberActionResponse, error) {
	target, err := s.getSaccoMembership(ctx, saccoID, membershipID)
	if err != nil {
		return nil, err
	}
	if target.Role == memberships.RoleAdmin {
		return nil, errors.New("cannot suspend the SACCO admin")
	}
	if target.Status != memberships.StatusActive {
		return nil, errors.New("only active memberships can be suspended")
	}

	updated, err := s.membershipRepo.UpdateStatus(ctx, membershipID, memberships.StatusSuspended)
	if err != nil {
		return nil, err
	}

	actorUUID, _ := uuid.Parse(actorUserID)
	_, _ = s.auditRepo.Create(ctx, &audit.CreateRequest{
		ActorUserID: &actorUUID,
		Action:      audit.ActionMemberSuspended,
		EntityType:  "membership",
		EntityID:    updated.ID,
		Details: map[string]interface{}{
			"sacco_id": saccoID,
			"user_id":  target.UserID.String(),
		},
	})

	return &MemberActionResponse{
		MembershipID: updated.ID.String(),
		Role:         updated.Role,
		Status:       updated.Status,
	}, nil
}

func (s *Service) Activate(ctx context.Context, actorUserID, saccoID, membershipID string) (*MemberActionResponse, error) {
	target, err := s.getSaccoMembership(ctx, saccoID, membershipID)
	if err != nil {
		return nil, err
	}
	if target.Status != memberships.StatusSuspended {
		return nil, errors.New("only suspended memberships can be reactivated")
	}

	updated, err := s.membershipRepo.Activate(ctx, membershipID)
	if err != nil {
		return nil, err
	}

	actorUUID, _ := uuid.Parse(actorUserID)
	_, _ = s.auditRepo.Create(ctx, &audit.CreateRequest{
		ActorUserID: &actorUUID,
		Action:      audit.ActionMemberActivated,
		EntityType:  "membership",
		EntityID:    updated.ID,
		Details: map[string]interface{}{
			"sacco_id": saccoID,
			"user_id":  target.UserID.String(),
		},
	})

	return &MemberActionResponse{
		MembershipID: updated.ID.String(),
		Role:         updated.Role,
		Status:       updated.Status,
	}, nil
}

func (s *Service) GetPublicSummary(ctx context.Context, saccoID string) (*PublicSummary, error) {
	record, err := s.saccoRepo.GetByID(ctx, saccoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("SACCO not found")
		}
		return nil, err
	}
	if record.Status != sacco.StatusApproved {
		return nil, errors.New("SACCO is not publicly visible")
	}

	memberCount, err := s.membershipRepo.CountActiveBySacco(ctx, saccoID)
	if err != nil {
		return nil, err
	}

	stats, err := s.txnRepo.GetSaccoStats(ctx, saccoID)
	if err != nil {
		return nil, err
	}

	recent, err := s.txnRepo.ListPublicBySacco(ctx, saccoID, 20)
	if err != nil {
		return nil, err
	}

	summary := &PublicSummary{
		SaccoID:           record.ID.String(),
		Name:              record.Name,
		Code:              record.Code,
		Status:            record.Status,
		ActiveMemberCount: memberCount,
		TransactionCount:  stats.Total,
		AnchoredCount:     stats.Anchored,
		RecentTransactions: make([]PublicTransaction, 0, len(recent)),
	}
	if record.Country != nil {
		summary.Country = *record.Country
	}

	for _, t := range recent {
		pt := PublicTransaction{
			ID:              t.ID.String(),
			ReferenceNumber: t.ReferenceNumber,
			TransactionType: t.TransactionType,
			Amount:          t.Amount,
			Currency:        t.Currency,
			Status:          t.Status,
			CreatedAt:       t.CreatedAt,
		}
		if t.StellarTxHash != nil {
			pt.StellarTxHash = *t.StellarTxHash
		}
		summary.RecentTransactions = append(summary.RecentTransactions, pt)
	}

	return summary, nil
}

func (s *Service) requireApprovedSacco(ctx context.Context, saccoID string) error {
	record, err := s.saccoRepo.GetByID(ctx, saccoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return errors.New("SACCO not found")
		}
		return err
	}
	if record.Status != sacco.StatusApproved {
		return errors.New("SACCO is not approved")
	}
	return nil
}

func (s *Service) getSaccoMembership(ctx context.Context, saccoID, membershipID string) (*memberships.Membership, error) {
	m, err := s.membershipRepo.GetByID(ctx, membershipID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("membership not found")
		}
		return nil, err
	}
	if m.SaccoID.String() != saccoID {
		return nil, errors.New("membership does not belong to this SACCO")
	}
	return m, nil
}
