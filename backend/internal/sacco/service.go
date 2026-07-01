package sacco

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"sentechain-backend/internal/documents"
	"sentechain-backend/internal/memberships"
)

type Service struct {
	saccoRepo      *Repository
	membershipRepo *memberships.Repository
	documentRepo   *documents.Repository
}

func NewService(saccoRepo *Repository, membershipRepo *memberships.Repository, documentRepo *documents.Repository) *Service {
	return &Service{
		saccoRepo:      saccoRepo,
		membershipRepo: membershipRepo,
		documentRepo:   documentRepo,
	}
}

func (s *Service) ListApproved(ctx context.Context, name, country string) ([]PublicListItem, error) {
	list, err := s.saccoRepo.ListApprovedFiltered(ctx, name, country)
	if err != nil {
		return nil, err
	}

	result := make([]PublicListItem, 0, len(list))
	for _, item := range list {
		entry := PublicListItem{
			ID:   item.ID.String(),
			Name: item.Name,
			Code: item.Code,
		}
		if item.Country != nil {
			entry.Country = *item.Country
		}
		result = append(result, entry)
	}
	return result, nil
}

func (s *Service) CreateDraft(ctx context.Context, userID string, req *CreateApplicationRequest) (*DetailResponse, error) {
	if req == nil || req.Name == "" || req.Country == "" {
		return nil, errors.New("name and country are required")
	}

	code, err := s.generateUniqueCode(ctx, req.Name)
	if err != nil {
		return nil, err
	}

	profile := ProfileFromMap(req.Profile)
	record, err := s.saccoRepo.CreateDraft(ctx, req.Name, code, req.Country, userID, profile)
	if err != nil {
		return nil, err
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, errors.New("invalid user id")
	}

	_, err = s.membershipRepo.Create(ctx, &memberships.CreateMembershipRequest{
		UserID:  userUUID,
		SaccoID: record.ID,
		Role:    memberships.RoleAdmin,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to link SACCO admin membership: %w", err)
	}

	return s.toDetailResponse(record), nil
}

func (s *Service) GetDetail(ctx context.Context, userID, saccoID string) (*DetailResponse, error) {
	record, err := s.getOwnedSacco(ctx, userID, saccoID)
	if err != nil {
		return nil, err
	}
	return s.toDetailResponse(record), nil
}

func (s *Service) UpdateDraft(ctx context.Context, userID, saccoID string, req *UpdateApplicationRequest) (*DetailResponse, error) {
	record, err := s.getOwnedSacco(ctx, userID, saccoID)
	if err != nil {
		return nil, err
	}
	if record.Status != StatusDraft {
		return nil, errors.New("only draft SACCO applications can be updated")
	}

	name := record.Name
	if req.Name != nil && *req.Name != "" {
		name = *req.Name
	}
	country := ""
	if record.Country != nil {
		country = *record.Country
	}
	if req.Country != nil && *req.Country != "" {
		country = *req.Country
	}

	profile := ProfileToMap(record.Profile)
	if req.Profile != nil {
		for k, v := range req.Profile {
			profile[k] = v
		}
	}

	updated, err := s.saccoRepo.UpdateDraft(ctx, saccoID, name, country, ProfileFromMap(profile))
	if err != nil {
		return nil, fmt.Errorf("failed to update SACCO: %w", err)
	}
	return s.toDetailResponse(updated), nil
}

func (s *Service) UploadDocuments(ctx context.Context, userID, saccoID string, req *documents.UploadRequest) error {
	record, err := s.getOwnedSacco(ctx, userID, saccoID)
	if err != nil {
		return err
	}
	if record.Status != StatusDraft && record.Status != StatusUnderReview {
		return errors.New("documents cannot be added for this SACCO status")
	}
	if req == nil || len(req.Documents) == 0 {
		return errors.New("at least one document is required")
	}

	for _, input := range req.Documents {
		if input.DocumentType == "" || input.FileURL == "" {
			return errors.New("document_type and file_url are required for each document")
		}
		_, err := s.documentRepo.Create(ctx, documents.OwnerTypeSacco, saccoID, userID, input)
		if err != nil {
			return fmt.Errorf("failed to save document: %w", err)
		}
	}
	return nil
}

func (s *Service) Submit(ctx context.Context, userID, saccoID string) (*StatusResponse, error) {
	record, err := s.getOwnedSacco(ctx, userID, saccoID)
	if err != nil {
		return nil, err
	}
	if record.Status != StatusDraft {
		return nil, fmt.Errorf("only draft SACCOs can be submitted (current: %s)", record.Status)
	}

	docs, err := s.documentRepo.ListByOwner(ctx, documents.OwnerTypeSacco, saccoID)
	if err != nil {
		return nil, err
	}
	if len(docs) == 0 {
		return nil, errors.New("upload at least one compliance document before submitting")
	}

	updated, err := s.saccoRepo.UpdateStatus(ctx, saccoID, StatusUnderReview)
	if err != nil {
		return nil, err
	}

	// Move admin membership to under_review while SACCO is being reviewed
	membership, err := s.membershipRepo.GetByUserAndSacco(ctx, userID, saccoID)
	if err == nil && membership.Status == memberships.StatusPendingKYC {
		_, _ = s.membershipRepo.UpdateStatus(ctx, membership.ID.String(), memberships.StatusUnderReview)
	}

	return s.toStatusResponse(updated), nil
}

func (s *Service) GetStatus(ctx context.Context, userID, saccoID string) (*StatusResponse, error) {
	record, err := s.getOwnedSacco(ctx, userID, saccoID)
	if err != nil {
		return nil, err
	}
	return s.toStatusResponse(record), nil
}

func (s *Service) getOwnedSacco(ctx context.Context, userID, saccoID string) (*SACCO, error) {
	record, err := s.saccoRepo.GetByID(ctx, saccoID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, errors.New("SACCO not found")
		}
		return nil, err
	}
	if record.CreatedBy == nil || record.CreatedBy.String() != userID {
		return nil, errors.New("not authorized to access this SACCO")
	}
	return record, nil
}

func (s *Service) toStatusResponse(record *SACCO) *StatusResponse {
	return &StatusResponse{
		SaccoID: record.ID.String(),
		Name:    record.Name,
		Status:  record.Status,
	}
}

func (s *Service) toDetailResponse(record *SACCO) *DetailResponse {
	return &DetailResponse{
		Sacco:   *s.toStatusResponse(record),
		Profile: ProfileToMap(record.Profile),
	}
}

var nonAlnum = regexp.MustCompile(`[^a-z0-9]+`)

func (s *Service) generateUniqueCode(ctx context.Context, name string) (string, error) {
	base := strings.ToUpper(nonAlnum.ReplaceAllString(strings.ToLower(name), ""))
	if len(base) > 8 {
		base = base[:8]
	}
	if base == "" {
		base = "SACCO"
	}

	for i := 0; i < 5; i++ {
		suffix := randomSuffix(4)
		code := base + suffix
		_, err := s.saccoRepo.GetByCode(ctx, code)
		if errors.Is(err, pgx.ErrNoRows) {
			return code, nil
		}
		if err != nil {
			return "", err
		}
	}
	return "", errors.New("failed to generate unique SACCO code")
}

func randomSuffix(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return strings.ToUpper(hex.EncodeToString(b))[:n]
}
