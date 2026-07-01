package onboarding

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"sentechain-backend/internal/documents"
	"sentechain-backend/internal/memberships"
)

type Service struct {
	membershipRepo *memberships.Repository
	documentRepo   *documents.Repository
}

func NewService(membershipRepo *memberships.Repository, documentRepo *documents.Repository) *Service {
	return &Service{
		membershipRepo: membershipRepo,
		documentRepo:   documentRepo,
	}
}

type StatusResponse struct {
	MembershipID string                  `json:"membership_id"`
	Status       string                  `json:"status"`
	Documents    []documents.PublicView  `json:"documents"`
}

func (s *Service) GetStatus(ctx context.Context, userID string) (*StatusResponse, error) {
	membership, err := s.membershipRepo.GetLatestByUser(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("membership not found")
		}
		return nil, fmt.Errorf("failed to get membership: %w", err)
	}

	docs, err := s.documentRepo.ListByOwner(ctx, documents.OwnerTypeMembership, membership.ID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to list documents: %w", err)
	}

	publicDocs := make([]documents.PublicView, 0, len(docs))
	for _, doc := range docs {
		publicDocs = append(publicDocs, documents.ToPublicView(doc))
	}

	return &StatusResponse{
		MembershipID: membership.ID.String(),
		Status:       membership.Status,
		Documents:    publicDocs,
	}, nil
}

func (s *Service) SubmitDocuments(ctx context.Context, userID string, req *documents.UploadRequest) (*StatusResponse, error) {
	if req == nil || len(req.Documents) == 0 {
		return nil, errors.New("at least one document is required")
	}

	membership, err := s.membershipRepo.GetLatestByUser(ctx, userID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("membership not found")
		}
		return nil, fmt.Errorf("failed to get membership: %w", err)
	}

	if membership.Status != memberships.StatusPendingKYC {
		return nil, fmt.Errorf("documents can only be submitted while status is %s", memberships.StatusPendingKYC)
	}

	for _, input := range req.Documents {
		if input.DocumentType == "" || input.FileURL == "" {
			return nil, errors.New("document_type and file_url are required for each document")
		}
		_, err := s.documentRepo.Create(ctx, documents.OwnerTypeMembership, membership.ID.String(), userID, input)
		if err != nil {
			return nil, fmt.Errorf("failed to save document: %w", err)
		}
	}

	updated, err := s.membershipRepo.UpdateStatus(ctx, membership.ID.String(), memberships.StatusUnderReview)
	if err != nil {
		return nil, fmt.Errorf("failed to update membership status: %w", err)
	}

	docs, err := s.documentRepo.ListByOwner(ctx, documents.OwnerTypeMembership, updated.ID.String())
	if err != nil {
		return nil, fmt.Errorf("failed to list documents: %w", err)
	}

	publicDocs := make([]documents.PublicView, 0, len(docs))
	for _, doc := range docs {
		publicDocs = append(publicDocs, documents.ToPublicView(doc))
	}

	return &StatusResponse{
		MembershipID: updated.ID.String(),
		Status:       updated.Status,
		Documents:    publicDocs,
	}, nil
}

// ParseUserID validates a user ID string
func ParseUserID(userID string) (uuid.UUID, error) {
	return uuid.Parse(userID)
}
