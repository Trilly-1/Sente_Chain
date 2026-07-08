package admin

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"sentechain-backend/internal/audit"
	"sentechain-backend/internal/documents"
	"sentechain-backend/internal/memberships"
	"sentechain-backend/internal/sacco"
	"sentechain-backend/internal/users"
)

type Service struct {
	userRepo       *users.Repository
	membershipRepo *memberships.Repository
	saccoRepo      *sacco.Repository
	documentRepo   *documents.Repository
	auditRepo      *audit.Repository
}

func NewService(
	userRepo *users.Repository,
	membershipRepo *memberships.Repository,
	saccoRepo *sacco.Repository,
	documentRepo *documents.Repository,
	auditRepo *audit.Repository,
) *Service {
	return &Service{
		userRepo:       userRepo,
		membershipRepo: membershipRepo,
		saccoRepo:      saccoRepo,
		documentRepo:   documentRepo,
		auditRepo:      auditRepo,
	}
}

type PendingMember struct {
	MembershipID string                `json:"membership_id"`
	UserID       string                `json:"user_id"`
	FullName     string                `json:"full_name"`
	Phone        string                `json:"phone"`
	SaccoID      string                `json:"sacco_id"`
	SaccoName    string                `json:"sacco_name"`
	Status       string                `json:"status"`
	SubmittedAt  string                `json:"submitted_at"`
	Documents    []documents.AdminView `json:"documents"`
}

type PendingSacco struct {
	SaccoID     string                 `json:"sacco_id"`
	Name        string                 `json:"name"`
	Country     string                 `json:"country"`
	Status      string                 `json:"status"`
	AdminName   string                 `json:"admin_name"`
	AdminPhone  string                 `json:"admin_phone"`
	SubmittedAt string                 `json:"submitted_at"`
	Profile     map[string]interface{} `json:"profile"`
	Documents   []documents.AdminView  `json:"documents"`
}

type ReviewResponse struct {
	MembershipID string `json:"membership_id"`
	Status       string `json:"status"`
}

type SaccoReviewResponse struct {
	SaccoID string `json:"sacco_id"`
	Status  string `json:"status"`
}

type RejectRequest struct {
	Reason string `json:"reason"`
}

// ListPendingMembers is deprecated — member approvals are handled per-SACCO by SACCO admins.
func (s *Service) ListPendingMembers(ctx context.Context) ([]PendingMember, error) {
	return nil, errors.New("member approvals are handled by each SACCO administrator")
}

func (s *Service) ListPendingSaccos(ctx context.Context) ([]PendingSacco, error) {
	saccosList, err := s.saccoRepo.ListByStatus(ctx, sacco.StatusUnderReview)
	if err != nil {
		return nil, fmt.Errorf("failed to list pending SACCOs: %w", err)
	}

	result := make([]PendingSacco, 0, len(saccosList))
	for _, record := range saccosList {
		entry := PendingSacco{
			SaccoID:     record.ID.String(),
			Name:        record.Name,
			Status:      record.Status,
			SubmittedAt: record.UpdatedAt.Format(time.RFC3339),
			Profile:     sacco.ProfileToMap(record.Profile),
		}
		if record.Country != nil {
			entry.Country = *record.Country
		}

		if record.CreatedBy != nil {
			if adminUser, err := s.userRepo.GetByID(ctx, record.CreatedBy.String()); err == nil {
				entry.AdminName = adminUser.FullName
				entry.AdminPhone = adminUser.Phone
			}
		}

		docs, err := s.documentRepo.ListByOwner(ctx, documents.OwnerTypeSacco, record.ID.String())
		if err != nil {
			return nil, fmt.Errorf("failed to load documents: %w", err)
		}
		for _, doc := range docs {
			entry.Documents = append(entry.Documents, documents.ToAdminView(doc))
		}

		result = append(result, entry)
	}

	return result, nil
}

// ApproveMember is deprecated — use SACCO admin PATCH /saccos/:saccoId/members/:id/approve.
func (s *Service) ApproveMember(ctx context.Context, actorUserID, membershipID string) (*ReviewResponse, error) {
	return nil, errors.New("member approvals are handled by each SACCO administrator")
}

// RejectMember is deprecated — use SACCO admin PATCH /saccos/:saccoId/members/:id/reject.
func (s *Service) RejectMember(ctx context.Context, actorUserID, membershipID string, reason string) (*ReviewResponse, error) {
	return nil, errors.New("member approvals are handled by each SACCO administrator")
}

func (s *Service) ApproveSacco(ctx context.Context, actorUserID, saccoID string) (*SaccoReviewResponse, error) {
	record, err := s.getReviewableSacco(ctx, saccoID)
	if err != nil {
		return nil, err
	}

	updated, err := s.saccoRepo.UpdateStatus(ctx, record.ID.String(), sacco.StatusApproved)
	if err != nil {
		return nil, fmt.Errorf("failed to approve SACCO: %w", err)
	}

	// Activate SACCO admin memberships
	adminMemberships, err := s.membershipRepo.ListBySacco(ctx, updated.ID.String())
	if err == nil {
		for _, m := range adminMemberships {
			if m.Role == memberships.RoleAdmin {
				_, _ = s.membershipRepo.Activate(ctx, m.ID.String())
			}
		}
	}

	actorUUID, _ := uuid.Parse(actorUserID)
	_, err = s.auditRepo.Create(ctx, &audit.CreateRequest{
		ActorUserID: &actorUUID,
		Action:      audit.ActionSaccoApproved,
		EntityType:  "sacco",
		EntityID:    updated.ID,
		Details: map[string]interface{}{
			"name": updated.Name,
			"code": updated.Code,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to write audit log: %w", err)
	}

	return &SaccoReviewResponse{SaccoID: updated.ID.String(), Status: updated.Status}, nil
}

func (s *Service) RejectSacco(ctx context.Context, actorUserID, saccoID, reason string) (*SaccoReviewResponse, error) {
	record, err := s.getReviewableSacco(ctx, saccoID)
	if err != nil {
		return nil, err
	}

	updated, err := s.saccoRepo.UpdateStatus(ctx, record.ID.String(), sacco.StatusRejected)
	if err != nil {
		return nil, fmt.Errorf("failed to reject SACCO: %w", err)
	}

	actorUUID, _ := uuid.Parse(actorUserID)
	_, err = s.auditRepo.Create(ctx, &audit.CreateRequest{
		ActorUserID: &actorUUID,
		Action:      audit.ActionSaccoRejected,
		EntityType:  "sacco",
		EntityID:    updated.ID,
		Details: map[string]interface{}{
			"name":   updated.Name,
			"reason": reason,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to write audit log: %w", err)
	}

	return &SaccoReviewResponse{SaccoID: updated.ID.String(), Status: updated.Status}, nil
}

func (s *Service) ListAuditLogs(ctx context.Context, limit, offset int) ([]*audit.Log, int, error) {
	logs, err := s.auditRepo.List(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	total, err := s.auditRepo.Count(ctx)
	if err != nil {
		return nil, 0, err
	}
	return logs, total, nil
}

func (s *Service) getReviewableSacco(ctx context.Context, saccoID string) (*sacco.SACCO, error) {
	record, err := s.saccoRepo.GetByID(ctx, saccoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("SACCO not found")
		}
		return nil, fmt.Errorf("failed to get SACCO: %w", err)
	}

	if record.Status != sacco.StatusUnderReview {
		return nil, fmt.Errorf("SACCO is not under review (current status: %s)", record.Status)
	}

	return record, nil
}
